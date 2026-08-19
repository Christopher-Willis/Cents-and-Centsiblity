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

export type PayFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';

export type IncomeType = 'hourly' | 'salary';

export interface IncomeSource {
  id: string;
  name: string;
  incomeType: IncomeType;
  amount: number;
  hoursPerPeriod?: number;
  frequency: PayFrequency;
  startDate: string;
  semiMonthlyDays: [number, number];
  monthlyDay: number;
  active: boolean;
}

export interface PayPeriod {
  sourceId: string;
  sourceName: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
}

export type Tab = 'dashboard' | 'transactions' | 'budget' | 'earnings' | 'import';
