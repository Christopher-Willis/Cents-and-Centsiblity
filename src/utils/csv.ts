import { Transaction, TransactionType, BudgetCategory } from '../types';

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (inQuotes) {
      if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export interface CsvParseResult {
  transactions: Transaction[];
  errors: string[];
}

export function parseCsv(
  csv: string,
  categories: BudgetCategory[],
  source: string,
): CsvParseResult {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return { transactions: [], errors: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const expected = ['date', 'description', 'amount'];
  const missing = expected.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { transactions: [], errors: [`Missing required columns: ${missing.join(', ')}`] };
  }

  const transactions: Transaction[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 3) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) {
      errors.push(`Row ${i}: invalid date "${row.date}"`);
      continue;
    }

    const amount = Number.parseFloat(row.amount.replace(/[$,]/g, ''));
    if (Number.isNaN(amount)) {
      errors.push(`Row ${i}: invalid amount "${row.amount}"`);
      continue;
    }

    let type: TransactionType = 'expense';
    if (row.type) {
      const normalized = row.type.toLowerCase();
      if (normalized === 'income' || normalized === 'credit') {
        type = 'income';
      } else if (normalized === 'expense' || normalized === 'debit') {
        type = 'expense';
      }
    } else if (amount < 0) {
      type = 'income';
    }

    let categoryId: string;
    if (type === 'income') {
      categoryId = 'income';
    } else {
      const categoryName = row.category?.toLowerCase() ?? '';
      const category = categories.find((c) => c.name.toLowerCase() === categoryName);
      categoryId = category?.id ?? 'misc';
    }

    transactions.push({
      id: `${Date.now()}-${i}`,
      date: date.toISOString(),
      description: row.description,
      amount: Math.abs(amount),
      type,
      categoryId,
      source,
    });
  }

  return { transactions, errors };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
