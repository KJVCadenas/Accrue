import { MemoryRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import SpendingBreakdown from "./pages/SpendingBreakdown";
import MonthlyTrends from "./pages/MonthlyTrends";
import Categories from "./pages/settings/Categories";
import AccountsManagement from "./pages/settings/AccountsManagement";
import DataBackup from "./pages/settings/DataBackup";

function App() {
  return (
    <MemoryRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/reports/breakdown" element={<SpendingBreakdown />} />
          <Route path="/reports/trends" element={<MonthlyTrends />} />
          <Route path="/settings/categories" element={<Categories />} />
          <Route path="/settings/accounts" element={<AccountsManagement />} />
          <Route path="/settings/data" element={<DataBackup />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

export default App;
