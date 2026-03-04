import { useCallback, useEffect, useRef, useState } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { processRecurringTransactions } from "./lib/tauri";
import { getAuthStatus, lockApp as lockAppCmd } from "./lib/auth";
import Layout from "./components/Layout";
import SetupWizard from "./pages/auth/SetupWizard";
import LockScreen from "./pages/auth/LockScreen";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import SpendingBreakdown from "./pages/SpendingBreakdown";
import MonthlyTrends from "./pages/MonthlyTrends";
import Categories from "./pages/settings/Categories";
import AccountsManagement from "./pages/settings/AccountsManagement";
import DataBackup from "./pages/settings/DataBackup";
import SecuritySettings from "./pages/settings/Security";

type AppState = "loading" | "setup" | "locked" | "unlocked";

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const lastActivityRef = useRef(Date.now());

  const refreshAuthStatus = useCallback(async () => {
    const status = await getAuthStatus();
    setBiometricEnabled(status.biometric_enabled);
    if (status.is_first_run) {
      setAppState("setup");
    } else if (status.is_locked) {
      setAppState("locked");
    } else {
      setAppState("unlocked");
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  // Process recurring transactions only after unlocking
  useEffect(() => {
    if (appState === "unlocked") {
      processRecurringTransactions().catch(console.error);
    }
  }, [appState]);

  const doLock = useCallback(async () => {
    await lockAppCmd();
    setAppState("locked");
  }, []);

  // Auto-lock idle timer — checks every 30 seconds
  useEffect(() => {
    if (appState !== "unlocked" || autoLockMinutes === 0) return;
    const interval = setInterval(async () => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle > autoLockMinutes * 60 * 1000) {
        await doLock();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [appState, autoLockMinutes, doLock]);

  // Activity listeners — reset idle timer on user interaction
  useEffect(() => {
    if (appState !== "unlocked") return;
    const reset = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", reset, { passive: true });
    window.addEventListener("keydown", reset, { passive: true });
    window.addEventListener("click", reset, { passive: true });
    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("click", reset);
    };
  }, [appState]);

  // Window blur auto-lock (only when auto-lock is enabled)
  useEffect(() => {
    if (appState !== "unlocked" || autoLockMinutes === 0) return;
    window.addEventListener("blur", doLock);
    return () => window.removeEventListener("blur", doLock);
  }, [appState, autoLockMinutes, doLock]);

  if (appState === "loading") {
    return <div className="auth-loading">Loading…</div>;
  }

  if (appState === "setup") {
    return <SetupWizard onComplete={() => setAppState("unlocked")} />;
  }

  if (appState === "locked") {
    return (
      <LockScreen
        biometricEnabled={biometricEnabled}
        onUnlocked={() => setAppState("unlocked")}
      />
    );
  }

  return (
    <MemoryRouter>
      <Routes>
        <Route element={<Layout onLock={doLock} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/reports/breakdown" element={<SpendingBreakdown />} />
          <Route path="/reports/trends" element={<MonthlyTrends />} />
          <Route path="/settings/categories" element={<Categories />} />
          <Route path="/settings/accounts" element={<AccountsManagement />} />
          <Route path="/settings/data" element={<DataBackup />} />
          <Route
            path="/settings/security"
            element={
              <SecuritySettings
                onAutoLockChange={setAutoLockMinutes}
                onLock={doLock}
              />
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

export default App;
