import { ScrollView, Text, View } from 'react-native';
import { BudgetCategory, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/csv';

interface TransactionListProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
}

export default function TransactionList({ transactions, categories }: TransactionListProps) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  return (
    <ScrollView className="flex-1 bg-midnight" contentContainerClassName="p-4 pb-32">
      <Text className="text-2xl font-bold mb-4 text-ink">Transactions</Text>
      {sorted.length === 0 ? (
        <View className="rounded-xl border border-white/[0.06] bg-surface p-8 items-center">
          <Text className="text-base text-ink-muted">No transactions imported yet.</Text>
          <Text className="text-[13px] text-ink-muted mt-2 text-center">
            Use the Import tab to add transactions manually.
          </Text>
        </View>
      ) : (
        sorted.map((t) => (
          <View
            key={t.id}
            className="rounded-xl border border-white/[0.06] bg-surface p-3.5 mb-2 flex-row justify-between items-center"
          >
            <View className="flex-1 mr-3">
              <Text className="text-[15px] font-semibold text-ink">{t.description}</Text>
              <Text className="text-xs text-ink-muted mt-0.5">
                {formatDate(t.date)} • {getCategoryName(t.categoryId)} • {t.source}
              </Text>
            </View>
            <Text
              className={`font-display text-[15px] ${
                t.type === 'income' ? 'text-mint' : 'text-coral'
              }`}
            >
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
