import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bill, BudgetCategory } from '../types';
import { formatCurrency } from '../utils/csv';
import {
  getBillActualForMonth,
  getBillLateDate,
  getBillOccurrences,
  getBillPlannedForMonth,
} from '../utils/bills';
import { formatLocalDate, monthName, parseLocalDate } from '../utils/earnings';

interface BillsViewProps {
  bills: Bill[];
  categories: BudgetCategory[];
  onBillsChange: React.Dispatch<React.SetStateAction<Bill[]>>;
}

interface BillOccurrence {
  bill: Bill;
  dueDate: string;
}

function webAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    (globalThis as any).alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
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

function getStatus(bill: Bill, dueDate: string) {
  const today = new Date();
  const due = parseLocalDate(dueDate);
  const paid = bill.paidDate ? parseLocalDate(bill.paidDate) : undefined;

  if (paid && paid.getFullYear() === due.getFullYear() && paid.getMonth() === due.getMonth()) {
    return { label: 'Paid', color: '#13d97f' };
  }

  const lateDateString = getBillLateDate(bill, dueDate);
  if (lateDateString) {
    const late = parseLocalDate(lateDateString);
    if (today > late) {
      return { label: 'Late', color: '#ff7d84' };
    }
  }

  if (today > due) {
    return { label: 'Due', color: '#ff7d84' };
  }

  return { label: 'Upcoming', color: '#8b939f' };
}

export default function BillsView({ bills, categories, onBillsChange }: BillsViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [dueDay, setDueDay] = useState('1');
  const [dueDate, setDueDate] = useState(formatLocalDate(now));
  const [endDate, setEndDate] = useState('');
  const [lateDay, setLateDay] = useState('');
  const [lateDate, setLateDate] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [paidDate, setPaidDate] = useState('');

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.id !== 'income'),
    [categories],
  );

  const occurrences = useMemo<BillOccurrence[]>(() => {
    return bills.flatMap((bill) =>
      getBillOccurrences(bill, year, month).map((dueDate) => ({ bill, dueDate })),
    );
  }, [bills, year, month]);

  const monthBills = useMemo(
    () => [...occurrences].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [occurrences],
  );

  const totals = useMemo(() => {
    const planned = bills.reduce((sum, b) => sum + getBillPlannedForMonth(b, year, month), 0);
    const paid = bills.reduce((sum, b) => sum + getBillActualForMonth(b, year, month), 0);
    return { planned, paid };
  }, [bills, year, month]);

  const resetForm = () => {
    setName('');
    setCategoryId(expenseCategories[0]?.id ?? '');
    setPlannedAmount('');
    setRecurring(true);
    setDueDay('1');
    setDueDate(formatLocalDate(now));
    setEndDate('');
    setLateDay('');
    setLateDate('');
    setActualAmount('');
    setPaidDate('');
    setEditingBillId(null);
  };

  const prefillForm = (bill: Bill) => {
    setEditingBillId(bill.id);
    setName(bill.name);
    setCategoryId(bill.categoryId);
    setPlannedAmount(bill.plannedAmount.toString());
    setRecurring(bill.recurring);
    setDueDay(bill.dueDay?.toString() ?? '1');
    setDueDate(bill.dueDate ?? formatLocalDate(now));
    setEndDate(bill.endDate ?? '');
    setLateDay(bill.lateDay?.toString() ?? '');
    setLateDate(bill.lateDate ?? '');
    setActualAmount(bill.actualAmount?.toString() ?? '');
    setPaidDate(bill.paidDate ?? '');
  };

  const toggleForm = () => {
    if (showForm) {
      setShowForm(false);
      resetForm();
    } else {
      setShowForm(true);
      resetForm();
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const validateDate = (value: string, label: string): string | null => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return `${label} must be YYYY-MM-DD.`;
    }
    return null;
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !categoryId) {
      webAlert('Invalid bill', 'Please enter a name and select a budget group.');
      return;
    }

    const planned = Number.parseFloat(plannedAmount);
    if (Number.isNaN(planned) || planned <= 0) {
      webAlert('Invalid amount', 'Please enter a positive planned amount.');
      return;
    }

    let dueDayNumber: number | undefined;
    let dueDateString: string | undefined;

    if (recurring) {
      const day = Number.parseInt(dueDay, 10);
      if (Number.isNaN(day) || day < 1 || day > 31) {
        webAlert('Invalid due day', 'Please enter a day of the month between 1 and 31.');
        return;
      }
      dueDayNumber = day;
    } else {
      const dueError = validateDate(dueDate, 'Due date');
      if (dueError) {
        webAlert('Invalid date', dueError);
        return;
      }
      dueDateString = formatLocalDate(new Date(dueDate));
    }

    if (endDate) {
      const endError = validateDate(endDate, 'End date');
      if (endError) {
        webAlert('Invalid date', endError);
        return;
      }
      if (dueDateString && parseLocalDate(endDate) < parseLocalDate(dueDateString)) {
        webAlert('Invalid end date', 'End date must be on or after the due date.');
        return;
      }
    }

    let lateDayNumber: number | undefined;
    let lateDateString: string | undefined;

    if (recurring && lateDay) {
      const offset = Number.parseInt(lateDay, 10);
      if (Number.isNaN(offset) || offset < 0) {
        webAlert('Invalid late day offset', 'Please enter a non-negative number of days.');
        return;
      }
      lateDayNumber = offset;
    }

    if (!recurring && lateDate) {
      const lateError = validateDate(lateDate, 'Late date');
      if (lateError) {
        webAlert('Invalid date', lateError);
        return;
      }
      const due = dueDateString ? parseLocalDate(dueDateString) : undefined;
      if (due && parseLocalDate(lateDate) < due) {
        webAlert('Invalid late date', 'Late date must be on or after the due date.');
        return;
      }
      lateDateString = formatLocalDate(new Date(lateDate));
    }

    if (paidDate && validateDate(paidDate, 'Paid date')) {
      webAlert('Invalid date', 'Paid date must be YYYY-MM-DD.');
      return;
    }

    let actual: number | undefined;
    if (actualAmount) {
      const parsedActual = Number.parseFloat(actualAmount);
      if (!Number.isNaN(parsedActual) && parsedActual >= 0) {
        actual = parsedActual;
      }
    }

    const billId = editingBillId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const bill: Bill = {
      id: billId,
      name: trimmedName,
      categoryId,
      plannedAmount: planned,
      recurring,
      dueDay: dueDayNumber,
      dueDate: dueDateString,
      endDate: endDate ? formatLocalDate(new Date(endDate)) : undefined,
      lateDay: lateDayNumber,
      lateDate: lateDateString,
      actualAmount: actual,
      paidDate: paidDate ? formatLocalDate(new Date(paidDate)) : undefined,
      active: true,
    };

    onBillsChange((prev) => {
      if (editingBillId) {
        return prev.map((b) => (b.id === editingBillId ? bill : b));
      }
      return [...prev, bill];
    });

    setShowForm(false);
    resetForm();
  };

  const handleEdit = (bill: Bill) => {
    prefillForm(bill);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    webConfirm(
      'Delete bill?',
      'This cannot be undone.',
      () => onBillsChange((prev) => prev.filter((b) => b.id !== id)),
      () => {},
      'Delete',
      'Cancel',
    );
  };

  const handleMarkPaid = (bill: Bill, dueDate: string) => {
    const due = parseLocalDate(dueDate);
    const paid = bill.paidDate ? parseLocalDate(bill.paidDate) : undefined;
    const isPaidThisMonth =
      paid && paid.getFullYear() === due.getFullYear() && paid.getMonth() === due.getMonth();

    if (isPaidThisMonth) {
      onBillsChange((prev) =>
        prev.map((b) =>
          b.id === bill.id ? { ...b, paidDate: undefined, actualAmount: undefined } : b,
        ),
      );
    } else {
      const amount = bill.actualAmount ?? bill.plannedAmount;
      onBillsChange((prev) =>
        prev.map((b) => (b.id === bill.id ? { ...b, paidDate: dueDate, actualAmount: amount } : b)),
      );
    }
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const renderForm = () => (
    <View className="bg-surface rounded-xl p-4 mb-4 border border-white/[0.06]">
      <Text className="text-[13px] font-semibold text-ink-muted mb-1">Bill name</Text>
      <TextInput
        className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
        value={name}
        onChangeText={setName}
        placeholder="Rent, electricity, etc."
        placeholderTextColor="#8b939f"
      />

      <Text className="text-[13px] font-semibold text-ink-muted mb-1">Budget group</Text>
      <View className="flex-row flex-wrap gap-2 mb-3">
        {expenseCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            className={`rounded-2xl py-1.5 px-3 border ${
              categoryId === category.id ? 'bg-mint border-mint' : 'bg-surface2 border-white/10'
            }`}
            onPress={() => setCategoryId(category.id)}
          >
            <Text
              className={`text-[13px] ${
                categoryId === category.id ? 'text-midnight font-semibold' : 'text-ink-muted'
              }`}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-[13px] font-semibold text-ink-muted mb-1">Planned amount</Text>
      <TextInput
        className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
        value={plannedAmount}
        onChangeText={setPlannedAmount}
        placeholder="0.00"
        placeholderTextColor="#8b939f"
        keyboardType="decimal-pad"
      />

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[13px] font-semibold text-ink-muted mb-1">Recurring monthly</Text>
        <Switch
          value={recurring}
          onValueChange={setRecurring}
          trackColor={{ false: '#20242c', true: '#13d97f' }}
          ios_backgroundColor="#20242c"
        />
      </View>

      {recurring ? (
        <>
          <Text className="text-[13px] font-semibold text-ink-muted mb-1">Due day of month</Text>
          <TextInput
            className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
            value={dueDay}
            onChangeText={setDueDay}
            placeholder="1-31"
            placeholderTextColor="#8b939f"
            keyboardType="number-pad"
          />

          <Text className="text-[13px] font-semibold text-ink-muted mb-1">End date (optional)</Text>
          <TextInput
            className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8b939f"
          />

          <Text className="text-[13px] font-semibold text-ink-muted mb-1">
            Late day offset (optional)
          </Text>
          <TextInput
            className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
            value={lateDay}
            onChangeText={setLateDay}
            placeholder="Days after due date"
            placeholderTextColor="#8b939f"
            keyboardType="number-pad"
          />
        </>
      ) : (
        <>
          <Text className="text-[13px] font-semibold text-ink-muted mb-1">Due date</Text>
          <TextInput
            className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8b939f"
          />

          <Text className="text-[13px] font-semibold text-ink-muted mb-1">
            Late date (optional)
          </Text>
          <TextInput
            className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
            value={lateDate}
            onChangeText={setLateDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8b939f"
          />
        </>
      )}

      <Text className="text-[13px] font-semibold text-ink-muted mb-1">
        Actual amount (optional)
      </Text>
      <TextInput
        className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
        value={actualAmount}
        onChangeText={setActualAmount}
        placeholder="0.00"
        placeholderTextColor="#8b939f"
        keyboardType="decimal-pad"
      />

      <Text className="text-[13px] font-semibold text-ink-muted mb-1">Paid date (optional)</Text>
      <TextInput
        className="border border-white/10 rounded-lg p-3 mb-3 bg-surface2 text-ink"
        value={paidDate}
        onChangeText={setPaidDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#8b939f"
      />

      <TouchableOpacity
        className="bg-mint rounded-lg py-3 px-4 items-center mb-4"
        onPress={handleSave}
      >
        <Text className="text-midnight font-semibold">
          {editingBillId ? 'Update bill' : 'Save bill'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-midnight" contentContainerClassName="p-4 pb-32">
      <Text className="text-2xl font-bold mb-4 text-ink">Bills</Text>

      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity className="p-2" onPress={handlePrevMonth}>
          <Text className="text-lg font-bold text-mint">&lt;</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-ink">{monthName(year, month)}</Text>
        <TouchableOpacity className="p-2" onPress={handleNextMonth}>
          <Text className="text-lg font-bold text-mint">&gt;</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-surface rounded-xl p-3 border border-white/[0.06] items-center">
          <Text className="text-xs text-ink-muted mb-1">Planned</Text>
          <Text className="font-display text-lg text-ink">{formatCurrency(totals.planned)}</Text>
        </View>
        <View className="flex-1 bg-surface rounded-xl p-3 border border-white/[0.06] items-center">
          <Text className="text-xs text-ink-muted mb-1">Paid</Text>
          <Text className="font-display text-lg text-ink">{formatCurrency(totals.paid)}</Text>
        </View>
      </View>

      <TouchableOpacity
        className="bg-mint rounded-lg py-3 px-4 items-center mb-4"
        onPress={toggleForm}
      >
        <Text className="text-midnight font-semibold">{showForm ? 'Cancel' : 'Add bill'}</Text>
      </TouchableOpacity>

      {showForm && renderForm()}

      <Text className="text-lg font-semibold mb-3 text-ink">Upcoming bills</Text>
      {monthBills.length === 0 ? (
        <Text className="text-ink-muted text-center mt-4">No bills for this month.</Text>
      ) : (
        monthBills.map(({ bill, dueDate }) => {
          const status = getStatus(bill, dueDate);
          const lateDateString = getBillLateDate(bill, dueDate);
          return (
            <View
              key={`${bill.id}-${dueDate}`}
              className="bg-surface rounded-xl p-4 mb-3 border border-white/[0.06]"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-base font-semibold flex-wrap text-ink">{bill.name}</Text>
                  <Text className="text-xs text-ink-muted mt-0.5">
                    {getCategoryName(bill.categoryId)} • Due{' '}
                    {formatLocalDate(parseLocalDate(dueDate))}
                    {lateDateString
                      ? ` • Late ${formatLocalDate(parseLocalDate(lateDateString))}`
                      : ''}
                    {bill.recurring
                      ? ` • ${bill.endDate ? `until ${bill.endDate}` : 'monthly'}`
                      : ''}
                  </Text>
                </View>
                <View
                  className="border rounded-xl py-0.5 px-2 self-start mt-0.5 shrink-0"
                  style={{ borderColor: status.color }}
                >
                  <Text className="text-xs font-semibold" style={{ color: status.color }}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-4 mb-3">
                <Text className="text-sm text-ink-muted">
                  Planned: {formatCurrency(bill.plannedAmount)}
                </Text>
                {bill.actualAmount !== undefined && (
                  <Text className="text-sm text-ink-muted">
                    Actual: {formatCurrency(bill.actualAmount)}
                  </Text>
                )}
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  className={`rounded-md py-1.5 px-2.5 ${
                    status.label === 'Paid' ? 'bg-surface2' : 'bg-mint'
                  }`}
                  onPress={() => handleMarkPaid(bill, dueDate)}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      status.label === 'Paid' ? 'text-ink' : 'text-midnight'
                    }`}
                  >
                    {status.label === 'Paid' ? 'Mark unpaid' : 'Mark paid'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-md py-1.5 px-2.5 bg-surface2"
                  onPress={() => handleEdit(bill)}
                >
                  <Text className="text-ink-muted text-xs font-semibold">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-md py-1.5 px-2.5 bg-coral/15"
                  onPress={() => handleDelete(bill.id)}
                >
                  <Text className="text-coral text-xs font-semibold">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
