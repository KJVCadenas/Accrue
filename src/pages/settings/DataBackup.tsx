import { useState } from "react";
import * as api from "../../lib/tauri";

export default function DataBackup() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<void>) {
    setLoading(name);
    setStatus("");
    try {
      await fn();
      setStatus(`${name} completed successfully.`);
    } catch (err: any) {
      setStatus(`Error: ${String(err)}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Data & Backup</h1>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Export Transactions</div>
        <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Export all transactions to a CSV file.
        </p>
        <button
          className="btn btn-primary"
          disabled={loading === "Export"}
          onClick={() => run("Export", api.exportTransactionsCsv)}
        >
          {loading === "Export" ? "Exporting…" : "Export CSV"}
        </button>

        <hr className="divider" />

        <div style={{ fontWeight: 700, marginBottom: 4 }}>Backup Database</div>
        <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Save a copy of the SQLite database file.
        </p>
        <button
          className="btn"
          disabled={loading === "Backup"}
          onClick={() => run("Backup", api.backupDatabase)}
        >
          {loading === "Backup" ? "Backing up…" : "Backup Database"}
        </button>

        <hr className="divider" />

        <div style={{ fontWeight: 700, marginBottom: 4 }}>Restore Database</div>
        <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Replace the current database with a backup file.{" "}
          <strong>This will overwrite all current data.</strong>
        </p>
        <button
          className="btn"
          disabled={loading === "Restore"}
          onClick={() => run("Restore", api.restoreDatabase)}
        >
          {loading === "Restore" ? "Restoring…" : "Restore from Backup"}
        </button>

        <hr className="divider" />

        <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--expense)" }}>
          Reset All Data
        </div>
        <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Permanently delete all accounts, transactions, and transfers. Default categories will be re-seeded.
          <strong> This cannot be undone.</strong>
        </p>
        <button
          className="btn btn-danger"
          disabled={loading === "Reset"}
          onClick={() => {
            if (
              confirm(
                "This will permanently delete ALL data. Are you absolutely sure?"
              )
            ) {
              run("Reset", api.resetAllData);
            }
          }}
        >
          {loading === "Reset" ? "Resetting…" : "Reset All Data"}
        </button>

        {status && (
          <div
            style={{
              marginTop: 16,
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
    </div>
  );
}
