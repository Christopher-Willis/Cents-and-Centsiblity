import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Bill, BudgetCategory, Transaction } from '../types';
import { formatCurrency } from '../utils/csv';
import { getBillActualForMonth, getBillPlannedForMonth } from '../utils/bills';
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
    <ScrollView className="flex-1 bg-[#f8f9fa]" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold mb-4">Budget</Text>

      <View className="bg-white rounded-xl p-4 mb-3 border border-[#e9ecef]">
        <Text className="text-lg font-semibold mb-3">Add budget group</Text>
        <TextInput
          className="border border-[#dee2e6] rounded-lg p-3 mb-3 bg-[#f8f9fa]"
          value={newName}
          onChangeText={setNewName}
          placeholder="Group name (e.g. Utilities)"
        />
        <TextInput
          className="border border-[#dee2e6] rounded-lg p-3 mb-3 bg-[#f8f9fa]"
          value={newBudget}
          onChangeText={setNewBudget}
          placeholder="Monthly budget limit"
          keyboardType="decimal-pad"
        />
        <TouchableOpacity
          className="bg-[#007bff] rounded-lg py-3 px-4 items-center"
          onPress={handleAddCategory}
        >
          <Text className="text-white font-semibold">Add group</Text>
        </TouchableOpacity>
      </View>

      {expenseCategories.length === 0 ? (
        <Text className="text-[#6c757d] text-center mt-8">No budget groups yet.</Text>
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
            <View
              key={category.id}
              className="bg-white rounded-xl p-4 mb-3 border border-[#e9ecef]"
            >
              {isEditing ? (
                <>
                  <TextInput
                    className="border border-[#dee2e6] rounded-lg p-3 mb-3 bg-[#f8f9fa]"
                    value={editName}
                    onChangeText={setEditName}
                  />
                  <TextInput
                    className="border border-[#dee2e6] rounded-lg p-3 mb-3 bg-[#f8f9fa]"
                    value={editBudget}
                    onChangeText={setEditBudget}
                    keyboardType="decimal-pad"
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-[#007bff] rounded-md py-2 px-3 items-center flex-1"
                      onPress={() => saveEdit(category.id)}
                    >
                      <Text className="text-white font-semibold">Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-[#e9ecef] rounded-md py-2 px-3 items-center flex-1"
                      onPress={cancelEdit}
                    >
                      <Text className="text-[#495057] font-semibold">Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-base font-semibold flex-1">{category.name}</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity className="p-1" onPress={() => startEdit(category)}>
                        <Text className="text-[13px] text-[#007bff] font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity className="p-1" onPress={() => handleDelete(category.id)}>
                        <Text className="text-[13px] font-semibold text-[#dc3545]">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <Text className="text-xs text-[#6c757d]">{formatCurrency(actual)} spent</Text>
                    <Text className="text-xs text-[#6c757d]">
                      {formatCurrency(planned)} planned
                    </Text>
                    <Text className="text-xs text-[#6c757d]">
                      {formatCurrency(category.budget)} budget
                    </Text>
                  </View>

                  <View className="h-2.5 bg-[#e9ecef] rounded-[5px] overflow-hidden">
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
                      afterPlanned < 0 ? 'text-[#dc3545] font-semibold' : 'text-[#495057]'
                    }`}
                  >
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
