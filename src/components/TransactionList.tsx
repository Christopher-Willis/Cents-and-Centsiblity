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
    <ScrollView className="flex-1 bg-[#f8f9fa]" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold mb-4">Transactions</Text>
      {sorted.length === 0 ? (
        <View className="bg-white rounded-xl p-8 items-center">
          <Text className="text-base text-[#6c757d]">No transactions imported yet.</Text>
          <Text className="text-[13px] text-[#adb5bd] mt-2 text-center">
            Use the Import tab to add transactions manually.
          </Text>
        </View>
      ) : (
        sorted.map((t) => (
          <View
            key={t.id}
            className="bg-white rounded-xl p-3.5 mb-2 flex-row justify-between items-center"
          >
            <View className="flex-1 mr-3">
              <Text className="text-[15px] font-semibold">{t.description}</Text>
              <Text className="text-xs text-[#6c757d] mt-0.5">
                {formatDate(t.date)} • {getCategoryName(t.categoryId)} • {t.source}
              </Text>
            </View>
            <Text
              className={`text-[15px] font-bold ${
                t.type === 'income' ? 'text-[#28a745]' : 'text-[#dc3545]'
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
