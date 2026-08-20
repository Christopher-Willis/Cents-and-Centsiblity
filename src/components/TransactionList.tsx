import { Text, View } from 'react-native';
import { BudgetCategory, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/csv';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import ScreenScroll from './ui/ScreenScroll';

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
    <ScreenScroll title="Transactions">
      {sorted.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No transactions imported yet."
            description="Use the Import tab to add transactions manually."
          />
        </Card>
      ) : (
        sorted.map((t) => (
          <Card key={t.id} className="mb-2 flex-row items-center justify-between p-3.5">
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
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}
