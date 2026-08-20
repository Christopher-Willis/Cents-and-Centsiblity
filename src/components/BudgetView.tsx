import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bill, BudgetCategory, Transaction } from '../types';
import { formatCurrency } from '../utils/csv';
import { getMonthRange, parseLocalDate } from '../utils/earnings';

interface BudgetViewProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  bills: Bill[];
  onCategoriesChange: React.Dispatch<React.SetStateAction<BudgetCategory[]>>;
}

function webConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel: () => void,
  confirmText = 'OK',
  cancelText = 'Cancel',
) {
  if (Platform.OS === 'web') {
    const confirmed = (globalThis as any).confirm(
      `${title}\n${message}\n\nClick OK to ${confirmText.toLowerCase()}. Click Cancel to ${cancelText.toLowerCase()}.`,
    );
    if (confirmed) {
      onConfirm();
    } else {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

const PRESET_COLORS = [
  '#f44336',
  '#ff9800',
  '#2196f3',
  '#9c27b0',
  '#e91e63',
  '#00bcd4',
  '#3f51b5',
  '#009688',
  '#795548',
  '#607d8b',
];

export default function BudgetView({
  transactions,
  categories,
  bills,
  onCategoriesChange,
}: BudgetViewProps) {
  const now = new Date();
  const { start, end } = getMonthRange(now.getFullYear(), now.getMonth() + 1);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.id !== 'income'),
    [categories],
  );

  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const getPlanned = (categoryId: string) =>
    bills
      .filter((b) => b.categoryId === categoryId)
      .filter((b) => {
        const due = parseLocalDate(b.dueDate);
        return due >= start && due <= end;
      })
      .reduce((sum, b) => sum + b.plannedAmount, 0);

  const getActual = (categoryId: string) =>
    transactions
      .filter((t) => t.type === 'expense' && t.categoryId === categoryId)
      .filter((t) => {
        const date = parseLocalDate(t.date);
        return date >= start && date <= end;
      })
      .reduce((sum, t) => sum + t.amount, 0);

  const handleAddCategory = () => {
    const budget = Number.parseFloat(newBudget);
    const name = newName.trim();
    if (!name || Number.isNaN(budget) || budget < 0) {
      Alert.alert('Invalid group', 'Please enter a name and a non-negative budget.');
      return;
    }

    const color = PRESET_COLORS[expenseCategories.length % PRESET_COLORS.length];
    const newCategory: BudgetCategory = {
      id: `category-${Date.now()}`,
      name,
      budget,
      color,
    };

    onCategoriesChange((prev) => [...prev, newCategory]);
    setNewName('');
    setNewBudget('');
  };

  const startEdit = (category: BudgetCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditBudget(category.budget.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditBudget('');
  };

  const saveEdit = (id: string) => {
    const budget = Number.parseFloat(editBudget);
    const name = editName.trim();
    if (!name || Number.isNaN(budget) || budget < 0) {
      Alert.alert('Invalid group', 'Please enter a name and a non-negative budget.');
      return;
    }

    onCategoriesChange((prev) => prev.map((c) => (c.id === id ? { ...c, name, budget } : c)));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    webConfirm(
      'Delete budget group?',
      'Bills and transactions tied to this group will keep the group name, but the group will no longer be reusable.',
      () => onCategoriesChange((prev) => prev.filter((c) => c.id !== id)),
      () => {},
      'Delete',
      'Cancel',
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Budget</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add budget group</Text>
        <TextInput
          style={styles.field}
          value={newName}
          onChangeText={setNewName}
          placeholder="Group name (e.g. Utilities)"
        />
        <TextInput
          style={styles.field}
          value={newBudget}
          onChangeText={setNewBudget}
          placeholder="Monthly budget limit"
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.button} onPress={handleAddCategory}>
          <Text style={styles.buttonText}>Add group</Text>
        </TouchableOpacity>
      </View>

      {expenseCategories.length === 0 ? (
        <Text style={styles.empty}>No budget groups yet.</Text>
      ) : (
        expenseCategories.map((category) => {
          const planned = getPlanned(category.id);
          const actual = getActual(category.id);
          const remaining = category.budget - actual;
          const afterPlanned = category.budget - actual - planned;

          const totalForBar = actual + planned;
          const percent =
            category.budget > 0 ? Math.min((totalForBar / category.budget) * 100, 100) : 0;
          const actualPercent = totalForBar > 0 ? (actual / totalForBar) * percent : 0;

          const isEditing = editingId === category.id;

          return (
            <View key={category.id} style={styles.card}>
              {isEditing ? (
                <>
                  <TextInput style={styles.field} value={editName} onChangeText={setEditName} />
                  <TextInput
                    style={styles.field}
                    value={editBudget}
                    onChangeText={setEditBudget}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.smallButton}
                      onPress={() => saveEdit(category.id)}
                    >
                      <Text style={styles.smallButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondarySmallButton} onPress={cancelEdit}>
                      <Text style={styles.secondarySmallButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.header}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => startEdit(category)}
                      >
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(category.id)}
                      >
                        <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.amounts}>
                    <Text style={styles.amountLabel}>{formatCurrency(actual)} spent</Text>
                    <Text style={styles.amountLabel}>{formatCurrency(planned)} planned</Text>
                    <Text style={styles.amountLabel}>{formatCurrency(category.budget)} budget</Text>
                  </View>

                  <View style={styles.barBackground}>
                    <View style={styles.barFillRow}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${actualPercent}%`,
                            backgroundColor: category.color,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.barFillPlanned,
                          {
                            width: `${percent - actualPercent}%`,
                            backgroundColor: category.color,
                            opacity: 0.5,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <Text style={[styles.remaining, afterPlanned < 0 && styles.overBudget]}>
                    {afterPlanned >= 0
                      ? `${formatCurrency(remaining)} left (${formatCurrency(afterPlanned)} after planned)`
                      : `${formatCurrency(Math.abs(afterPlanned))} over budget after planned`}
                  </Text>
                </>
              )}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  field: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '600',
  },
  dangerText: {
    color: '#dc3545',
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  barBackground: {
    height: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFillRow: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  barFillPlanned: {
    height: '100%',
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
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#007bff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondarySmallButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1,
  },
  secondarySmallButtonText: {
    color: '#495057',
    fontWeight: '600',
  },
});
