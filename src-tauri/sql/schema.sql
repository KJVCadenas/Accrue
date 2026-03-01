PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash','debit','credit','savings','investment')),
  subtype TEXT,
  currency TEXT NOT NULL DEFAULT 'PHP',
  opening_balance REAL NOT NULL DEFAULT 0,
  credit_limit REAL,
  billing_cycle_day INTEGER,
  payment_due_day INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('income','expense','both')),
  icon TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_account_id INTEGER NOT NULL REFERENCES accounts(id),
  to_account_id INTEGER NOT NULL REFERENCES accounts(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  transfer_type TEXT NOT NULL DEFAULT 'regular' CHECK (transfer_type IN ('regular','credit_payment')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  category_id INTEGER REFERENCES categories(id),
  transfer_id INTEGER REFERENCES transfers(id),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('daily','weekly','monthly','yearly')),
  next_due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
