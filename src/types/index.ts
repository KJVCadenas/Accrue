export interface Account {
  id: number;
  name: string;
  type: "cash" | "debit" | "credit" | "savings" | "investment";
  subtype: string | null;
  currency: string;
  opening_balance: number;
  credit_limit: number | null;
  billing_cycle_day: number | null;
  payment_due_day: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface Category {
  id: number;
  name: string;
  direction: "income" | "expense" | "both";
  icon: string | null;
  is_archived: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number | null;
  transfer_id: number | null;
  type: "income" | "expense";
  amount: number;
  date: string;
  notes: string | null;
  is_recurring: number;
  recurrence_frequency: string | null;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  account_name: string | null;
}

export interface Transfer {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: string;
  notes: string | null;
  transfer_type: "regular" | "credit_payment";
  created_at: string;
}

export interface CategorySpend {
  category_id: number | null;
  category_name: string;
  amount: number;
}

export interface DashboardData {
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  accounts: AccountWithBalance[];
  recent_transactions: Transaction[];
  spending_by_category: CategorySpend[];
}

export interface SpendingBreakdown {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  categories: CategorySpend[];
}

export interface MonthSummary {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CreateTransactionInput {
  account_id: number;
  category_id: number | null;
  tx_type: string;
  amount: number;
  date: string;
  notes: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  next_due_date: string | null;
}

export interface CreateTransferInput {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: string;
  notes: string | null;
  transfer_type: string | null;
}
