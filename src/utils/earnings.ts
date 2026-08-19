import { IncomeSource, PayFrequency, PayPeriod } from '../types';

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getPeriodAmount(source: IncomeSource): number {
  if (source.incomeType === 'hourly') {
    return (source.hoursPerPeriod ?? 0) * source.amount;
  }
  return source.amount;
}

function daysForFrequency(frequency: PayFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'bi-weekly':
      return 14;
    default:
      return 0;
  }
}

export function getPayPeriodsInRange(
  source: IncomeSource,
  rangeStart: Date,
  rangeEnd: Date,
): PayPeriod[] {
  if (!source.active) return [];

  const startDate = parseLocalDate(source.startDate);
  const baseAmount = getPeriodAmount(source);
  const periods: PayPeriod[] = [];

  if (source.frequency === 'weekly' || source.frequency === 'bi-weekly') {
    const interval = daysForFrequency(source.frequency);

    let current = new Date(startDate);
    while (current < rangeStart) {
      current = addDays(current, interval);
    }

    let previousPayDate = addDays(current, -interval);
    while (current <= rangeEnd) {
      const periodStart = previousPayDate < rangeStart ? rangeStart : addDays(previousPayDate, 1);
      const periodEnd = current;

      periods.push({
        sourceId: source.id,
        sourceName: source.name,
        payDate: formatLocalDate(periodEnd),
        periodStart: formatLocalDate(periodStart),
        periodEnd: formatLocalDate(periodEnd),
        amount: baseAmount,
      });

      previousPayDate = new Date(current);
      current = addDays(current, interval);
    }
  } else if (source.frequency === 'semi-monthly') {
    const [firstDay, secondDay] = source.semiMonthlyDays;
    const monthCursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

    let previousPayDate = startDate;
    while (previousPayDate >= monthCursor) {
      previousPayDate = addDays(previousPayDate, -15);
    }

    while (monthCursor <= endMonth) {
      const year = monthCursor.getFullYear();
      const month = monthCursor.getMonth();
      const daysInMonth = getDaysInMonth(year, month + 1);

      const candidateDays = [firstDay, secondDay]
        .map((d) => Math.min(d, daysInMonth))
        .sort((a, b) => a - b);

      for (const day of candidateDays) {
        const payDate = new Date(year, month, day);
        if (payDate < startDate || payDate < rangeStart || payDate > rangeEnd) {
          previousPayDate = payDate;
          continue;
        }

        const periodStartCandidate = addDays(previousPayDate, 1);
        const periodStart = periodStartCandidate < rangeStart ? rangeStart : periodStartCandidate;
        const periodEnd = payDate;

        periods.push({
          sourceId: source.id,
          sourceName: source.name,
          payDate: formatLocalDate(payDate),
          periodStart: formatLocalDate(periodStart),
          periodEnd: formatLocalDate(periodEnd),
          amount: baseAmount,
        });

        previousPayDate = payDate;
      }

      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }
  } else if (source.frequency === 'monthly') {
    const monthlyDay = source.monthlyDay;
    const monthCursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

    let previousPayDate = startDate;
    while (previousPayDate >= monthCursor) {
      const previousMonth = new Date(previousPayDate.getFullYear(), previousPayDate.getMonth(), 1);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const daysInPrevious = getDaysInMonth(
        previousMonth.getFullYear(),
        previousMonth.getMonth() + 1,
      );
      const day = Math.min(monthlyDay, daysInPrevious);
      previousPayDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), day);
    }

    while (monthCursor <= endMonth) {
      const year = monthCursor.getFullYear();
      const month = monthCursor.getMonth();
      const daysInMonth = getDaysInMonth(year, month + 1);
      const day = Math.min(monthlyDay, daysInMonth);
      const payDate = new Date(year, month, day);

      if (payDate >= startDate && payDate >= rangeStart && payDate <= rangeEnd) {
        const periodStartCandidate = addDays(previousPayDate, 1);
        const periodStart = periodStartCandidate < rangeStart ? rangeStart : periodStartCandidate;
        const periodEnd = payDate;

        periods.push({
          sourceId: source.id,
          sourceName: source.name,
          payDate: formatLocalDate(payDate),
          periodStart: formatLocalDate(periodStart),
          periodEnd: formatLocalDate(periodEnd),
          amount: baseAmount,
        });

        previousPayDate = payDate;
      } else {
        previousPayDate = payDate;
      }

      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }
  }

  return periods.sort((a, b) => a.payDate.localeCompare(b.payDate));
}

export function getAllPayPeriodsInRange(
  sources: IncomeSource[],
  rangeStart: Date,
  rangeEnd: Date,
): PayPeriod[] {
  const periods = sources.flatMap((source) => getPayPeriodsInRange(source, rangeStart, rangeEnd));
  return periods.sort((a, b) => a.payDate.localeCompare(b.payDate));
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function getSourcePayDateSet(source: IncomeSource): Set<string> {
  const startDate = parseLocalDate(source.startDate);
  const endDate = addYears(startDate, 5);
  const periods = getPayPeriodsInRange(source, startDate, endDate);
  return new Set(periods.map((p) => p.payDate));
}

export function getIncomeForMonth(
  transactions: { amount: number; type: string; date: string }[],
  year: number,
  month: number,
): number {
  const { start, end } = getMonthRange(year, month);
  return transactions.reduce((sum, t) => {
    if (t.type !== 'income') return sum;
    const date = parseLocalDate(t.date);
    if (date >= start && date <= end) {
      return sum + t.amount;
    }
    return sum;
  }, 0);
}

export function monthName(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
