import { useMemo, useState } from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Bill, BudgetCategory, Transaction } from '../types';
import { formatCurrency } from '../utils/csv';
import { getBillActualForMonth, getBillPlannedForMonth } from '../utils/bills';
import { getMonthRange, parseLocalDate } from '../utils/earnings';
import Button from './ui/Button';
import Card from './ui/Card';
import FormField from './ui/FormField';
import ScreenScroll from './ui/ScreenScroll';

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

  const getCategoryBills = (categoryId: string) => bills.filter((b) => b.categoryId === categoryId);

  const getPlanned = (categoryId: string) =>
    getCategoryBills(categoryId).reduce(
      (sum, b) =>
        sum +
        getBillPlannedForMonth(b, now.getFullYear(), now.getMonth() + 1) -
        getBillActualForMonth(b, now.getFullYear(), now.getMonth() + 1),
      0,
    );

  const getActual = (categoryId: string) => {
    const transactionTotal = transactions
      .filter((t) => t.type === 'expense' && t.categoryId === categoryId)
      .filter((t) => {
        const date = parseLocalDate(t.date);
        return date >= start && date <= end;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const billTotal = getCategoryBills(categoryId).reduce(
      (sum, b) => sum + getBillActualForMonth(b, now.getFullYear(), now.getMonth() + 1),
      0,
    );
    return transactionTotal + billTotal;
  };

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
    <ScreenScroll title="Budget">
      <Card className="mb-3 p-4">
        <Text className="text-lg font-semibold mb-3 text-ink">Add budget group</Text>
        <FormField
          value={newName}
          onChangeText={setNewName}
          placeholder="Group name (e.g. Utilities)"
        />
        <FormField
          value={newBudget}
          onChangeText={setNewBudget}
          placeholder="Monthly budget limit"
          keyboardType="decimal-pad"
        />
        <Button label="Add group" onPress={handleAddCategory} className="py-3 px-4" />
      </Card>

      {expenseCategories.length === 0 ? (
        <Text className="text-ink-muted text-center mt-8">No budget groups yet.</Text>
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
            <Card key={category.id} className="mb-3 p-4">
              {isEditing ? (
                <>
                  <FormField value={editName} onChangeText={setEditName} />
                  <FormField
                    value={editBudget}
                    onChangeText={setEditBudget}
                    keyboardType="decimal-pad"
                  />
                  <View className="flex-row gap-2">
                    <Button
                      label="Save"
                      onPress={() => saveEdit(category.id)}
                      className="flex-1 py-2 px-3"
                    />
                    <Button
                      label="Cancel"
                      onPress={cancelEdit}
                      variant="secondary-muted"
                      className="flex-1 py-2 px-3"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-base font-semibold flex-1 text-ink">{category.name}</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity className="p-1" onPress={() => startEdit(category)}>
                        <Text className="text-[13px] text-mint font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity className="p-1" onPress={() => handleDelete(category.id)}>
                        <Text className="text-[13px] font-semibold text-coral">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <Text className="text-xs text-ink-muted">{formatCurrency(actual)} spent</Text>
                    <Text className="text-xs text-ink-muted">
                      {formatCurrency(planned)} planned
                    </Text>
                    <Text className="text-xs text-ink-muted">
                      {formatCurrency(category.budget)} budget
                    </Text>
                  </View>

                  <View className="h-2.5 bg-surface2 rounded-[5px] overflow-hidden">
                    <View className="flex-row h-full rounded-[5px] overflow-hidden">
                      <View
                        className="h-full"
                        style={{
                          width: `${actualPercent}%`,
                          backgroundColor: category.color,
                        }}
                      />
                      <View
                        className="h-full opacity-50"
                        style={{
                          width: `${percent - actualPercent}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </View>
                  </View>

                  <Text
                    className={`mt-2 text-[13px] ${
                      afterPlanned < 0 ? 'text-coral font-semibold' : 'text-ink-muted'
                    }`}
                  >
                    {afterPlanned >= 0
                      ? `${formatCurrency(remaining)} left (${formatCurrency(afterPlanned)} after planned)`
                      : `${formatCurrency(Math.abs(afterPlanned))} over budget after planned`}
                  </Text>
                </>
              )}
            </Card>
          );
        })
      )}
    </ScreenScroll>
  );
}
