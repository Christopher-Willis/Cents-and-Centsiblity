export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  source: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  budget: number;
  color: string;
}

export type Tab = 'dashboard' | 'transactions' | 'budget' | 'import';
