import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Transactions</Text>
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No transactions imported yet.</Text>
          <Text style={styles.emptySubtext}>Use the Import tab to add transactions manually.</Text>
        </View>
      ) : (
        sorted.map((t) => (
          <View key={t.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.description}>{t.description}</Text>
              <Text style={styles.meta}>
                {formatDate(t.date)} • {getCategoryName(t.categoryId)} • {t.source}
              </Text>
            </View>
            <Text style={[styles.amount, t.type === 'income' ? styles.income : styles.expense]}>
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </Text>
          </View>
        ))
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#adb5bd',
    marginTop: 8,
    textAlign: 'center',
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  income: {
    color: '#28a745',
  },
  expense: {
    color: '#dc3545',
  },
});
