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
import { Bill, BudgetCategory } from '../types';
import { formatCurrency } from '../utils/csv';
import { formatLocalDate, getMonthRange, monthName, parseLocalDate } from '../utils/earnings';

interface BillsViewProps {
  bills: Bill[];
  categories: BudgetCategory[];
  onBillsChange: React.Dispatch<React.SetStateAction<Bill[]>>;
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

function getStatus(bill: Bill) {
  const today = new Date();
  if (bill.paidDate) {
    return { label: 'Paid', color: '#28a745' };
  }
  if (bill.lateDate && parseLocalDate(bill.lateDate) < today) {
    return { label: 'Late', color: '#dc3545' };
  }
  if (parseLocalDate(bill.dueDate) < today) {
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
  const [dueDate, setDueDate] = useState(formatLocalDate(now));
  const [lateDate, setLateDate] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [paidDate, setPaidDate] = useState('');

  const { start, end } = useMemo(() => getMonthRange(year, month), [year, month]);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.id !== 'income'),
    [categories],
  );

  const monthBills = useMemo(() => {
    return bills
      .filter((b) => {
        const d = parseLocalDate(b.dueDate);
        return d >= start && d <= end;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, start, end]);

  const totals = useMemo(() => {
    const planned = monthBills.reduce((sum, b) => sum + b.plannedAmount, 0);
    const actual = monthBills.reduce((sum, b) => sum + (b.actualAmount ?? 0), 0);
    const paid = monthBills.reduce((sum, b) => sum + (b.paidDate ? (b.actualAmount ?? 0) : 0), 0);
    return { planned, actual, paid };
  }, [monthBills]);

  const resetForm = () => {
    setName('');
    setCategoryId(expenseCategories[0]?.id ?? '');
    setPlannedAmount('');
    setDueDate(formatLocalDate(now));
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
    setDueDate(bill.dueDate);
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

    const dueError = validateDate(dueDate, 'Due date');
    if (dueError) {
      webAlert('Invalid date', dueError);
      return;
    }

    if (lateDate) {
      const lateError = validateDate(lateDate, 'Late date');
      if (lateError) {
        webAlert('Invalid date', lateError);
        return;
      }
      if (parseLocalDate(lateDate) < parseLocalDate(dueDate)) {
        webAlert('Invalid late date', 'Late date must be on or after the due date.');
        return;
      }
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
      dueDate: formatLocalDate(new Date(dueDate)),
      lateDate: lateDate ? formatLocalDate(new Date(lateDate)) : undefined,
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

  const handleMarkPaid = (bill: Bill) => {
    const paid = bill.paidDate ? undefined : formatLocalDate(new Date());
    const actual = bill.paidDate ? undefined : (bill.actualAmount ?? bill.plannedAmount);
    onBillsChange((prev) =>
      prev.map((b) =>
        b.id === bill.id ? { ...b, paidDate: paid, actualAmount: actual ?? b.plannedAmount } : b,
      ),
    );
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
        monthBills.map((bill) => {
          const status = getStatus(bill);
          return (
            <View key={bill.id} style={styles.billCard}>
              <View style={styles.billHeader}>
                <View>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billMeta}>
                    {getCategoryName(bill.categoryId)} • Due{' '}
                    {formatLocalDate(parseLocalDate(bill.dueDate))}
                    {bill.lateDate
                      ? ` • Late ${formatLocalDate(parseLocalDate(bill.lateDate))}`
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
                    bill.paidDate ? styles.paidButton : styles.unpaidButton,
                  ]}
                  onPress={() => handleMarkPaid(bill)}
                >
                  <Text style={styles.smallButtonText}>
                    {bill.paidDate ? 'Mark unpaid' : 'Mark paid'}
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
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  dangerSmallButton: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f8d7da',
  },
  dangerSmallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc3545',
  },
});
