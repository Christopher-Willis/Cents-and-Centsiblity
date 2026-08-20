import { Ionicons } from '@expo/vector-icons';
import { Circle, Svg } from 'react-native-svg';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BudgetCategory, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/csv';

interface DashboardProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  onImportPress: () => void;
}

function getMonthTransactions(transactions: Transaction[]) {
  const now = new Date();
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function Dashboard({ transactions, categories, onImportPress }: DashboardProps) {
  const monthTransactions = getMonthTransactions(transactions);
  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;
  const [balanceDollars, balanceCents] = formatCurrency(balance).split('.');

  const budgetTotal = categories
    .filter((c) => c.id !== 'income')
    .reduce((sum, c) => sum + c.budget, 0);
  const remaining = budgetTotal - expenses;
  const remainingPct = budgetTotal > 0 ? Math.max(0, Math.min(1, remaining / budgetTotal)) : 0;

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <ScrollView className="flex-1 bg-midnight" contentContainerClassName="p-5 pb-32">
      <Text className="mb-6 text-[15px] font-semibold text-ink-muted">Cents & Centsibility</Text>

      <View className="mb-1 gap-0.5">
        <Text className="text-[13px] font-semibold text-ink-muted">Monthly balance</Text>
        <View className="flex-row items-baseline">
          <Text className="font-display text-[52px] leading-[52px] text-ink">
            {balanceDollars}
            <Text className="text-[26px] text-ink-muted">.{balanceCents}</Text>
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2.5">
        <View className="flex-1 rounded-2xl border border-white/[0.06] bg-surface p-4">
          <View className="mb-2 flex-row items-center gap-1.5">
            <Ionicons name="arrow-up-outline" size={13} color="#13d97f" />
            <Text className="text-[11.5px] font-semibold text-ink-muted">Income</Text>
          </View>
          <Text className="font-display text-[19px] text-ink">{formatCurrency(income)}</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-white/[0.06] bg-surface p-4">
          <View className="mb-2 flex-row items-center gap-1.5">
            <Ionicons name="arrow-down-outline" size={13} color="#ff7d84" />
            <Text className="text-[11.5px] font-semibold text-ink-muted">Expenses</Text>
          </View>
          <Text className="font-display text-[19px] text-ink">{formatCurrency(expenses)}</Text>
        </View>
      </View>

      <View className="mt-2.5 flex-row items-center gap-4 rounded-2xl border border-white/[0.06] bg-surface p-4">
        <View className="-rotate-90">
          <Svg width={62} height={62} viewBox="0 0 62 62">
            <Circle
              cx={31}
              cy={31}
              r={RING_RADIUS}
              stroke="#ffffff14"
              strokeWidth={6}
              fill="none"
            />
            <Circle
              cx={31}
              cy={31}
              r={RING_RADIUS}
              stroke={remaining >= 0 ? '#13d97f' : '#ff7d84'}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - remainingPct)}
            />
          </Svg>
        </View>
        <View className="gap-0.5">
          <Text className="text-[11.5px] font-semibold text-ink-muted">Budget remaining</Text>
          <Text className="font-display text-[22px] text-ink">{formatCurrency(remaining)}</Text>
          <Text className="text-[11px] text-ink-muted">
            {Math.round(remainingPct * 100)}% of plan left
          </Text>
        </View>
      </View>

      <Text className="mb-3 mt-6 text-[15px] font-bold text-ink">Recent</Text>

      {recent.length === 0 ? (
        <View className="items-center rounded-2xl border border-white/[0.06] bg-surface p-6">
          <Text className="mb-3 text-ink-muted">No transactions yet.</Text>
          <TouchableOpacity className="rounded-full bg-mint px-4 py-2.5" onPress={onImportPress}>
            <Text className="font-semibold text-midnight">Import transactions</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="gap-1.5">
          {recent.map((t) => (
            <View
              key={t.id}
              className="flex-row items-center gap-3 rounded-2xl border border-white/[0.06] bg-surface p-3"
            >
              <View
                className={
                  t.type === 'income'
                    ? 'h-9 w-9 items-center justify-center rounded-[10px] bg-mint/15'
                    : 'h-9 w-9 items-center justify-center rounded-[10px] bg-coral/15'
                }
              >
                <Ionicons
                  name={t.type === 'income' ? 'arrow-up-outline' : 'arrow-down-outline'}
                  size={15}
                  color={t.type === 'income' ? '#13d97f' : '#ff7d84'}
                />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-[13.5px] font-semibold text-ink">{t.description}</Text>
                <Text className="text-[11px] text-ink-muted">{formatDate(t.date)}</Text>
              </View>
              <Text
                className={
                  t.type === 'income'
                    ? 'font-display text-[13.5px] text-mint'
                    : 'font-display text-[13.5px] text-coral'
                }
              >
                {t.type === 'income' ? '+' : '-'}
                {formatCurrency(t.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
