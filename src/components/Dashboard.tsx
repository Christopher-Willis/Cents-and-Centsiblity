import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
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

export default function Dashboard({ transactions, categories, onImportPress }: DashboardProps) {
  const monthTransactions = getMonthTransactions(transactions);
  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;

  const budgetTotal = categories
    .filter((c) => c.id !== 'income')
    .reduce((sum, c) => sum + c.budget, 0);
  const remaining = budgetTotal - expenses;

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <ScrollView className="flex-1 bg-[#f8f9fa]" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold mb-4">Cents & Centsibility</Text>

      <View className="gap-3">
        <View className="bg-white rounded-xl p-4 border border-[#e9ecef] flex-1 items-center">
          <Text className="text-xs text-[#6c757d] mb-1">Monthly Balance</Text>
          <Text
            className={`text-[22px] font-bold ${balance >= 0 ? 'text-[#28a745]' : 'text-[#dc3545]'}`}
          >
            {formatCurrency(balance)}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="bg-white rounded-xl p-4 border border-[#e9ecef] flex-1 items-center">
            <Text className="text-xs text-[#6c757d] mb-1">Income</Text>
            <Text className="text-[22px] font-bold text-[#28a745]">{formatCurrency(income)}</Text>
          </View>
          <View className="bg-white rounded-xl p-4 border border-[#e9ecef] flex-1 items-center">
            <Text className="text-xs text-[#6c757d] mb-1">Expenses</Text>
            <Text className="text-[22px] font-bold text-[#dc3545]">{formatCurrency(expenses)}</Text>
          </View>
        </View>

        <View className="bg-white rounded-xl p-4 border border-[#e9ecef] flex-1">
          <Text className="text-xs text-[#6c757d] mb-1">Budget Remaining</Text>
          <Text
            className={`text-[22px] font-bold ${remaining >= 0 ? 'text-[#28a745]' : 'text-[#dc3545]'}`}
          >
            {formatCurrency(remaining)}
          </Text>
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-lg font-semibold mb-3">Recent Transactions</Text>
        {recent.length === 0 ? (
          <View className="bg-white rounded-xl p-6 items-center">
            <Text className="text-[#6c757d] mb-3">No transactions yet.</Text>
            <TouchableOpacity
              className="bg-[#007bff] rounded-lg py-2.5 px-4"
              onPress={onImportPress}
            >
              <Text className="text-white font-semibold">Import transactions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recent.map((t) => (
            <View
              key={t.id}
              className="bg-white rounded-xl p-3 mb-2 flex-row justify-between items-center"
            >
              <View className="flex-1 mr-2">
                <Text className="text-sm font-semibold">{t.description}</Text>
                <Text className="text-xs text-[#6c757d] mt-0.5">{formatDate(t.date)}</Text>
              </View>
              <Text
                className={`text-sm font-bold ${t.type === 'income' ? 'text-[#28a745]' : 'text-[#dc3545]'}`}
              >
                {t.type === 'income' ? '+' : '-'}
                {formatCurrency(t.amount)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
