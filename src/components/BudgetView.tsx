import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BudgetCategory, Transaction } from '../types';
import { formatCurrency } from '../utils/csv';

interface BudgetViewProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
}

function getSpent(transactions: Transaction[], categoryId: string) {
  return transactions
    .filter((t) => t.type === 'expense' && t.categoryId === categoryId)
    .reduce((sum, t) => sum + t.amount, 0);
}

export default function BudgetView({ transactions, categories }: BudgetViewProps) {
  const budgetCategories = categories.filter((c) => c.id !== 'income');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Budget</Text>
      {budgetCategories.length === 0 ? (
        <Text style={styles.empty}>No budget categories set up.</Text>
      ) : (
        budgetCategories.map((category) => {
          const spent = getSpent(transactions, category.id);
          const remaining = category.budget - spent;
          const percent = category.budget > 0 ? Math.min((spent / category.budget) * 100, 100) : 0;

          return (
            <View key={category.id} style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.budgetText}>
                  {formatCurrency(spent)} / {formatCurrency(category.budget)}
                </Text>
              </View>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${percent}%`, backgroundColor: category.color },
                  ]}
                />
              </View>
              <Text style={[styles.remaining, remaining < 0 && styles.overBudget]}>
                {remaining >= 0
                  ? `${formatCurrency(remaining)} left`
                  : `${formatCurrency(Math.abs(remaining))} over budget`}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  empty: {
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetText: {
    fontSize: 14,
    color: '#6c757d',
  },
  barBackground: {
    height: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  remaining: {
    marginTop: 8,
    fontSize: 13,
    color: '#495057',
  },
  overBudget: {
    color: '#dc3545',
    fontWeight: '600',
  },
});
