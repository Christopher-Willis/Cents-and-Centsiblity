import { BudgetCategory } from '../types';

export const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { id: 'income', name: 'Income', budget: 0, color: '#4caf50' },
  { id: 'housing', name: 'Housing', budget: 1200, color: '#f44336' },
  { id: 'food', name: 'Food & Dining', budget: 600, color: '#ff9800' },
  { id: 'transport', name: 'Transportation', budget: 300, color: '#2196f3' },
  { id: 'utilities', name: 'Utilities', budget: 250, color: '#9c27b0' },
  { id: 'entertainment', name: 'Entertainment', budget: 200, color: '#e91e63' },
  { id: 'shopping', name: 'Shopping', budget: 300, color: '#00bcd4' },
  { id: 'health', name: 'Health & Fitness', budget: 150, color: '#3f51b5' },
  { id: 'savings', name: 'Savings', budget: 500, color: '#009688' },
  { id: 'misc', name: 'Miscellaneous', budget: 200, color: '#795548' },
];
