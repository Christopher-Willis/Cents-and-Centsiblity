import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cents & Centsibility</Text>

      <View style={styles.summary}>
        <View style={[styles.card, styles.balanceCard]}>
          <Text style={styles.label}>Monthly Balance</Text>
          <Text style={[styles.amount, balance >= 0 ? styles.positive : styles.negative]}>
            {formatCurrency(balance)}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.label}>Income</Text>
            <Text style={[styles.amount, styles.positive]}>{formatCurrency(income)}</Text>
          </View>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.label}>Expenses</Text>
            <Text style={[styles.amount, styles.negative]}>{formatCurrency(expenses)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Budget Remaining</Text>
          <Text style={[styles.amount, remaining >= 0 ? styles.positive : styles.negative]}>
            {formatCurrency(remaining)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions yet.</Text>
            <TouchableOpacity style={styles.button} onPress={onImportPress}>
              <Text style={styles.buttonText}>Import transactions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recent.map((t) => (
            <View key={t.id} style={styles.transaction}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>{t.description}</Text>
                <Text style={styles.transactionDate}>{formatDate(t.date)}</Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  t.type === 'income' ? styles.positive : styles.negative,
                ]}
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
  summary: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flex: 1,
  },
  balanceCard: {
    alignItems: 'center',
  },
  halfCard: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
  },
  positive: {
    color: '#28a745',
  },
  negative: {
    color: '#dc3545',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  empty: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6c757d',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  transaction: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 8,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
