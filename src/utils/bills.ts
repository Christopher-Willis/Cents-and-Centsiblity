import { Bill } from '../types';
import { formatLocalDate, getDaysInMonth, parseLocalDate } from './earnings';

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function getBillOccurrences(bill: Bill, year: number, month: number): string[] {
  if (!bill.recurring) {
    if (!bill.dueDate) return [];
    const d = parseLocalDate(bill.dueDate);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      return [bill.dueDate];
    }
    return [];
  }

  if (!bill.dueDay) return [];
  const day = Math.min(bill.dueDay, getDaysInMonth(year, month));
  const due = new Date(year, month - 1, day);

  if (bill.endDate) {
    const end = parseLocalDate(bill.endDate);
    if (due > end) return [];
  }

  return [formatLocalDate(due)];
}

export function getBillPlannedForMonth(bill: Bill, year: number, month: number): number {
  const occurrences = getBillOccurrences(bill, year, month);
  return occurrences.length * bill.plannedAmount;
}

export function getBillActualForMonth(bill: Bill, year: number, month: number): number {
  const occurrences = getBillOccurrences(bill, year, month);
  if (occurrences.length === 0) return 0;

  if (!bill.paidDate || !bill.actualAmount) return 0;
  const paid = parseLocalDate(bill.paidDate);
  const paidInMonth = paid.getFullYear() === year && paid.getMonth() + 1 === month;
  return paidInMonth ? bill.actualAmount : 0;
}

export function getBillLateDate(bill: Bill, dueDate: string): string | undefined {
  if (!bill.lateDay) return bill.lateDate;
  const due = parseLocalDate(dueDate);
  const late = new Date(due);
  late.setDate(due.getDate() + bill.lateDay);
  return formatLocalDate(late);
}
