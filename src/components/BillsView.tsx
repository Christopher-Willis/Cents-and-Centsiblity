import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
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
    return { label: 'Paid', color: '#28a745' };
  }

  const lateDateString = getBillLateDate(bill, dueDate);
  if (lateDateString) {
    const late = parseLocalDate(lateDateString);
    if (today > late) {
      return { label: 'Late', color: '#dc3545' };
    }
  }

  if (today > due) {
    return { label: 'Due', color: '#fd7e14' };
  }

  return { label: 'Upcoming', color: '#6c757d' };
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
    <View style={styles.formCard}>
      <Text style={styles.label}>Bill name</Text>
      <TextInput
        style={styles.field}
        value={name}
        onChangeText={setName}
        placeholder="Rent, electricity, etc."
      />

      <Text style={styles.label}>Budget group</Text>
      <View style={styles.categoryRow}>
        {expenseCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryChip, categoryId === category.id && styles.categoryActive]}
            onPress={() => setCategoryId(category.id)}
          >
            <Text
              style={[styles.categoryText, categoryId === category.id && styles.categoryActiveText]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Planned amount</Text>
      <TextInput
        style={styles.field}
        value={plannedAmount}
        onChangeText={setPlannedAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Recurring monthly</Text>
        <Switch value={recurring} onValueChange={setRecurring} />
      </View>

      {recurring ? (
        <>
          <Text style={styles.label}>Due day of month</Text>
          <TextInput
            style={styles.field}
            value={dueDay}
            onChangeText={setDueDay}
            placeholder="1-31"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>End date (optional)</Text>
          <TextInput
            style={styles.field}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>Late day offset (optional)</Text>
          <TextInput
            style={styles.field}
            value={lateDay}
            onChangeText={setLateDay}
            placeholder="Days after due date"
            keyboardType="number-pad"
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Due date</Text>
          <TextInput
            style={styles.field}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>Late date (optional)</Text>
          <TextInput
            style={styles.field}
            value={lateDate}
            onChangeText={setLateDate}
            placeholder="YYYY-MM-DD"
          />
        </>
      )}

      <Text style={styles.label}>Actual amount (optional)</Text>
      <TextInput
        style={styles.field}
        value={actualAmount}
        onChangeText={setActualAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Paid date (optional)</Text>
      <TextInput
        style={styles.field}
        value={paidDate}
        onChangeText={setPaidDate}
        placeholder="YYYY-MM-DD"
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>{editingBillId ? 'Update bill' : 'Save bill'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Bills</Text>

      <View style={styles.monthRow}>
        <TouchableOpacity style={styles.monthButton} onPress={handlePrevMonth}>
          <Text style={styles.monthButtonText}>&lt;</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthName(year, month)}</Text>
        <TouchableOpacity style={styles.monthButton} onPress={handleNextMonth}>
          <Text style={styles.monthButtonText}>&gt;</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Planned</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totals.planned)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totals.paid)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={toggleForm}>
        <Text style={styles.buttonText}>{showForm ? 'Cancel' : 'Add bill'}</Text>
      </TouchableOpacity>

      {showForm && renderForm()}

      <Text style={styles.sectionTitle}>Upcoming bills</Text>
      {monthBills.length === 0 ? (
        <Text style={styles.empty}>No bills for this month.</Text>
      ) : (
        monthBills.map(({ bill, dueDate }) => {
          const status = getStatus(bill, dueDate);
          const lateDateString = getBillLateDate(bill, dueDate);
          return (
            <View key={`${bill.id}-${dueDate}`} style={styles.billCard}>
              <View style={styles.billHeader}>
                <View>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billMeta}>
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
                <View style={[styles.statusBadge, { borderColor: status.color }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.billAmounts}>
                <Text style={styles.billAmount}>Planned: {formatCurrency(bill.plannedAmount)}</Text>
                {bill.actualAmount !== undefined && (
                  <Text style={styles.billAmount}>Actual: {formatCurrency(bill.actualAmount)}</Text>
                )}
              </View>

              <View style={styles.billActions}>
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    status.label === 'Paid' ? styles.paidButton : styles.unpaidButton,
                  ]}
                  onPress={() => handleMarkPaid(bill, dueDate)}
                >
                  <Text style={styles.smallButtonText}>
                    {status.label === 'Paid' ? 'Mark unpaid' : 'Mark paid'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondarySmallButton}
                  onPress={() => handleEdit(bill)}
                >
                  <Text style={styles.secondarySmallButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dangerSmallButton}
                  onPress={() => handleDelete(bill.id)}
                >
                  <Text style={styles.dangerSmallButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
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
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007bff',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  field: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  categoryActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryText: {
    color: '#495057',
    fontSize: 13,
  },
  categoryActiveText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  empty: {
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
  },
  billMeta: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  billAmounts: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  billAmount: {
    fontSize: 14,
    color: '#495057',
  },
  billActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  unpaidButton: {
    backgroundColor: '#28a745',
  },
  paidButton: {
    backgroundColor: '#6c757d',
  },
  secondarySmallButton: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#e9ecef',
  },
  secondarySmallButtonText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerSmallButton: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f8d7da',
  },
  dangerSmallButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '600',
  },
});
