import { invoke } from "@tauri-apps/api/core";
import {
  AccountWithBalance,
  Category,
  CreateTransactionInput,
  CreateTransferInput,
  DashboardData,
  MonthSummary,
  SpendingBreakdown,
  Transaction,
  Transfer,
} from "../types";

export const listAccounts = () =>
  invoke<AccountWithBalance[]>("list_accounts");

export const getAccount = (id: number) =>
  invoke<AccountWithBalance>("get_account", { id });

export const createAccount = (data: {
  name: string;
  account_type: string;
  subtype?: string | null;
  opening_balance: number;
  credit_limit?: number | null;
  billing_cycle_day?: number | null;
  payment_due_day?: number | null;
}) => invoke<AccountWithBalance>("create_account", data);

export const updateAccount = (
  id: number,
  data: {
    name: string;
    account_type: string;
    subtype?: string | null;
    opening_balance: number;
    credit_limit?: number | null;
    billing_cycle_day?: number | null;
    payment_due_day?: number | null;
  }
) => invoke<AccountWithBalance>("update_account", { id, ...data });

export const archiveAccount = (id: number) =>
  invoke<void>("archive_account", { id });

export const restoreAccount = (id: number) =>
  invoke<void>("restore_account", { id });

export const listTransactions = (filters?: {
  account_id?: number | null;
  category_id?: number | null;
  tx_type?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  search?: string | null;
}) => invoke<Transaction[]>("list_transactions", filters ?? {});

export const createTransaction = (data: CreateTransactionInput) =>
  invoke<Transaction>("create_transaction", { ...data });

export const updateTransaction = (id: number, data: CreateTransactionInput) =>
  invoke<Transaction>("update_transaction", { id, ...data });

export const deleteTransaction = (id: number) =>
  invoke<void>("delete_transaction", { id });

export const createTransfer = (data: CreateTransferInput) =>
  invoke<Transfer>("create_transfer", { ...data });

export const deleteTransfer = (id: number) =>
  invoke<void>("delete_transfer", { id });

export const listCategories = () => invoke<Category[]>("list_categories");

export const createCategory = (data: {
  name: string;
  direction: string;
  icon?: string | null;
}) => invoke<Category>("create_category", data);

export const updateCategory = (
  id: number,
  data: { name: string; direction: string; icon?: string | null }
) => invoke<Category>("update_category", { id, ...data });

export const archiveCategory = (id: number) =>
  invoke<void>("archive_category", { id });

export const restoreCategory = (id: number) =>
  invoke<void>("restore_category", { id });

export const getDashboard = () => invoke<DashboardData>("get_dashboard");

export const getSpendingBreakdown = (year: number, month: number) =>
  invoke<SpendingBreakdown>("get_spending_breakdown", { year, month });

export const getMonthlyTrends = (months: number) =>
  invoke<MonthSummary[]>("get_monthly_trends", { months });

export const exportTransactionsCsv = () =>
  invoke<void>("export_transactions_csv");

export const backupDatabase = () => invoke<void>("backup_database");

export const restoreDatabase = () => invoke<void>("restore_database");

export const resetAllData = () => invoke<void>("reset_all_data");
