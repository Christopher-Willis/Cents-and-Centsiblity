import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BudgetCategory,
  IncomeOverride,
  IncomeSource,
  IncomeType,
  PayFrequency,
  PayPeriod,
  Transaction,
} from '../types';
import { usePersistentState } from '../hooks/usePersistentState';
import {
  formatLocalDate,
  getAllPayPeriodsInRange,
  getIncomeForMonth,
  getMonthRange,
  getPeriodAmount,
  getSourcePayDateSet,
  monthName,
  parseLocalDate,
} from '../utils/earnings';
import { formatCurrency } from '../utils/csv';

interface EarningsViewProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  sources: IncomeSource[];
  onSourcesChange: React.Dispatch<React.SetStateAction<IncomeSource[]>>;
}

interface DisplayPeriod extends PayPeriod {
  effectiveAmount: number;
  isRealized: boolean;
  isManual: boolean;
}

const FREQUENCIES: { key: PayFrequency; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'bi-weekly', label: 'Bi-weekly' },
  { key: 'semi-monthly', label: 'Semi-monthly (1st & 15th)' },
  { key: 'monthly', label: 'Monthly' },
];

const INCOME_TYPES: { key: IncomeType; label: string }[] = [
  { key: 'salary', label: 'Salary per paycheck' },
  { key: 'hourly', label: 'Hourly' },
];

function todayInput(): string {
  return formatLocalDate(new Date());
}

function displayDate(isoOrDate: string): string {
  const d = parseLocalDate(isoOrDate);
  return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function transactionDateKey(t: Transaction): string {
  const d = new Date(t.date);
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

function overrideKey(sourceId: string, payDate: string): string {
  return `${sourceId}:${payDate}`;
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

export default function EarningsView({
  transactions,
  sources,
  onSourcesChange,
}: EarningsViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [overrides, setOverrides] = usePersistentState<IncomeOverride[]>('incomeOverrides', []);

  const [name, setName] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('salary');
  const [amount, setAmount] = useState('');
  const [hoursPerPeriod, setHoursPerPeriod] = useState('');
  const [frequency, setFrequency] = useState<PayFrequency>('bi-weekly');
  const [startDate, setStartDate] = useState(todayInput());
  const [monthlyDay, setMonthlyDay] = useState('1');
  const [semiDay1, setSemiDay1] = useState('1');
  const [semiDay2, setSemiDay2] = useState('15');

  const [editPeriod, setEditPeriod] = useState<DisplayPeriod | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const { start, end } = useMemo(() => getMonthRange(year, month), [year, month]);

  const activeSources = useMemo(() => sources.filter((s) => s.active), [sources]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, IncomeOverride>();
    for (const override of overrides) {
      map.set(overrideKey(override.sourceId, override.payDate), override);
    }
    return map;
  }, [overrides]);

  const incomeTransactionDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'income') continue;
      const key = transactionDateKey(t);
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return map;
  }, [transactions]);

  const projectedPeriods = useMemo<DisplayPeriod[]>(() => {
    const base = getAllPayPeriodsInRange(activeSources, start, end);
    return base.map((period) => {
      const realizedAmount = incomeTransactionDates.get(period.payDate);
      const override = overrideMap.get(overrideKey(period.sourceId, period.payDate));
      const isRealized = realizedAmount !== undefined;
      const effectiveAmount = isRealized ? realizedAmount : (override?.amount ?? period.amount);
      return {
        ...period,
        effectiveAmount,
        isRealized,
        isManual: !isRealized && override !== undefined,
      };
    });
  }, [activeSources, start, end, overrideMap, incomeTransactionDates]);

  const { realIncome, remainingProjected, totalExpected } = useMemo(() => {
    const realIncome = getIncomeForMonth(transactions, year, month);
    const remainingProjected = projectedPeriods.reduce(
      (sum, p) => (p.isRealized ? sum : sum + p.effectiveAmount),
      0,
    );
    return { realIncome, remainingProjected, totalExpected: realIncome + remainingProjected };
  }, [transactions, projectedPeriods, year, month]);

  const resetForm = () => {
    setName('');
    setIncomeType('salary');
    setAmount('');
    setHoursPerPeriod('');
    setFrequency('bi-weekly');
    setStartDate(todayInput());
    setMonthlyDay('1');
    setSemiDay1('1');
    setSemiDay2('15');
    setEditingSourceId(null);
  };

  const prefillForm = (source: IncomeSource) => {
    setName(source.name);
    setIncomeType(source.incomeType);
    setAmount(source.amount.toString());
    setHoursPerPeriod(source.hoursPerPeriod?.toString() ?? '');
    setFrequency(source.frequency);
    setStartDate(source.startDate);
    setMonthlyDay(source.monthlyDay.toString());
    setSemiDay1(source.semiMonthlyDays[0].toString());
    setSemiDay2(source.semiMonthlyDays[1].toString());
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

  const handleEditSource = (source: IncomeSource) => {
    setEditingSourceId(source.id);
    prefillForm(source);
    setShowForm(true);
  };

  const buildSource = (id: string): IncomeSource | null => {
    const numericAmount = Number.parseFloat(amount);
    if (!name.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      webAlert('Invalid source', 'Please enter a name and a positive amount.');
      return null;
    }

    let numericHours: number | undefined;
    if (incomeType === 'hourly') {
      numericHours = Number.parseFloat(hoursPerPeriod);
      if (Number.isNaN(numericHours) || numericHours <= 0) {
        webAlert('Invalid hours', 'Please enter a positive number of hours per period.');
        return null;
      }
    }

    const parsedStart = parseLocalDate(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      webAlert('Invalid date', 'Use YYYY-MM-DD format for the start date.');
      return null;
    }

    const parsedMonthlyDay = Number.parseInt(monthlyDay, 10) || 1;
    const parsedSemiDay1 = Number.parseInt(semiDay1, 10) || 1;
    const parsedSemiDay2 = Number.parseInt(semiDay2, 10) || 15;

    return {
      id,
      name: name.trim(),
      incomeType,
      amount: numericAmount,
      hoursPerPeriod: numericHours,
      frequency,
      startDate: formatLocalDate(parsedStart),
      monthlyDay: Math.max(1, Math.min(31, parsedMonthlyDay)),
      semiMonthlyDays: [
        Math.max(1, Math.min(31, parsedSemiDay1)),
        Math.max(1, Math.min(31, parsedSemiDay2)),
      ] as [number, number],
      active: true,
    };
  };

  const cleanOverridesForSource = (
    sourceId: string,
    keepManual: boolean,
    source?: IncomeSource,
  ) => {
    const validDates = source ? getSourcePayDateSet(source) : new Set<string>();
    setOverrides((prev) =>
      prev.filter((o) => {
        if (o.sourceId !== sourceId) return true;
        if (!keepManual) return false;
        return validDates.has(o.payDate);
      }),
    );
  };

  const finalizeSave = (sourceId: string, keepManual: boolean, source: IncomeSource) => {
    onSourcesChange((prev) => prev.map((s) => (s.id === sourceId ? source : s)));
    cleanOverridesForSource(sourceId, keepManual, source);
    setShowForm(false);
    resetForm();
  };

  const payCycleChanged = (original: IncomeSource | undefined, updated: IncomeSource): boolean => {
    if (!original) return true;
    return (
      original.frequency !== updated.frequency ||
      original.startDate !== updated.startDate ||
      original.monthlyDay !== updated.monthlyDay ||
      original.semiMonthlyDays[0] !== updated.semiMonthlyDays[0] ||
      original.semiMonthlyDays[1] !== updated.semiMonthlyDays[1]
    );
  };

  const handleSaveSource = () => {
    const sourceId = editingSourceId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const source = buildSource(sourceId);
    if (!source) return;

    if (editingSourceId) {
      const originalSource = sources.find((s) => s.id === editingSourceId);
      const hasManualOverrides = overrides.some((o) => o.sourceId === editingSourceId);
      if (hasManualOverrides && payCycleChanged(originalSource, source)) {
        webConfirm(
          'Pay cycle changed',
          'Changing the pay cycle will reset all manual paycheck estimates for this source.',
          () => finalizeSave(editingSourceId, false, source),
          () => {},
          'Continue',
          'Cancel',
        );
      } else if (hasManualOverrides) {
        webConfirm(
          'Keep manual projections?',
          'This source has paychecks with manually edited amounts. Keep those manual amounts, or recalculate all projected paychecks from the new settings?',
          () => finalizeSave(editingSourceId, true, source),
          () => finalizeSave(editingSourceId, false, source),
          'Keep manual',
          'Recalculate all',
        );
      } else {
        finalizeSave(editingSourceId, true, source);
      }
    } else {
      onSourcesChange((prev) => [...prev, source]);
      setShowForm(false);
      resetForm();
    }
  };

  const toggleActive = (id: string) => {
    onSourcesChange(sources.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const handleDelete = (id: string) => {
    webConfirm(
      'Delete income source?',
      'This cannot be undone.',
      () => {
        onSourcesChange(sources.filter((s) => s.id !== id));
        setOverrides((prev) => prev.filter((o) => o.sourceId !== id));
      },
      () => {},
      'Delete',
      'Cancel',
    );
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

  const openPaycheckEdit = (period: DisplayPeriod) => {
    if (period.isRealized) return;
    setEditPeriod(period);
    setEditAmount(period.effectiveAmount.toString());
  };

  const closePaycheckEdit = () => {
    setEditPeriod(null);
    setEditAmount('');
  };

  const handleSaveOverride = () => {
    if (!editPeriod) return;
    const numericAmount = Number.parseFloat(editAmount);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      webAlert('Invalid amount', 'Please enter a positive amount.');
      return;
    }

    setOverrides((prev) => {
      const existing = prev.findIndex(
        (o) => o.sourceId === editPeriod.sourceId && o.payDate === editPeriod.payDate,
      );
      const updated: IncomeOverride = {
        sourceId: editPeriod.sourceId,
        payDate: editPeriod.payDate,
        amount: numericAmount,
      };
      if (existing >= 0) {
        return prev.map((o, i) => (i === existing ? updated : o));
      }
      return [...prev, updated];
    });
    closePaycheckEdit();
  };

  const handleRemoveOverride = () => {
    if (!editPeriod) return;
    setOverrides((prev) =>
      prev.filter((o) => !(o.sourceId === editPeriod.sourceId && o.payDate === editPeriod.payDate)),
    );
    closePaycheckEdit();
  };

  const renderFrequencyFields = () => {
    if (frequency === 'monthly') {
      return (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Pay day of month</Text>
          <TextInput
            style={styles.field}
            value={monthlyDay}
            onChangeText={setMonthlyDay}
            keyboardType="number-pad"
            placeholder="1"
          />
        </View>
      );
    }

    if (frequency === 'semi-monthly') {
      return (
        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex]}>
            <Text style={styles.label}>First pay day</Text>
            <TextInput
              style={styles.field}
              value={semiDay1}
              onChangeText={setSemiDay1}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
          <View style={[styles.fieldGroup, styles.flex]}>
            <Text style={styles.label}>Second pay day</Text>
            <TextInput
              style={styles.field}
              value={semiDay2}
              onChangeText={setSemiDay2}
              keyboardType="number-pad"
              placeholder="15"
            />
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Earnings</Text>

      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthButton} onPress={handlePrevMonth}>
          <Text style={styles.monthButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthName(year, month)}</Text>
        <TouchableOpacity style={styles.monthButton} onPress={handleNextMonth}>
          <Text style={styles.monthButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.label}>Real income</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(realIncome)}</Text>
        </View>
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.label}>Projected</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(remainingProjected)}</Text>
        </View>
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.label}>Total expected</Text>
          <Text style={[styles.summaryAmount, styles.positive]}>
            {formatCurrency(totalExpected)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Income sources</Text>
          <TouchableOpacity style={styles.smallButton} onPress={toggleForm}>
            <Text style={styles.smallButtonText}>{showForm ? 'Cancel' : 'Add source'}</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={[styles.card, styles.formCard]}>
            <Text style={styles.label}>Source name</Text>
            <TextInput
              style={styles.field}
              value={name}
              onChangeText={setName}
              placeholder="Day job, freelance, etc."
            />

            <Text style={styles.label}>Income type</Text>
            <View style={styles.typeRow}>
              {INCOME_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeButton, incomeType === type.key && styles.typeActive]}
                  onPress={() => setIncomeType(type.key)}
                >
                  <Text style={incomeType === type.key ? styles.typeActiveText : styles.typeText}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              {incomeType === 'hourly' ? 'Hourly rate' : 'Amount per paycheck'}
            </Text>
            <TextInput
              style={styles.field}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            {incomeType === 'hourly' && (
              <>
                <Text style={styles.label}>Expected hours per period</Text>
                <TextInput
                  style={styles.field}
                  value={hoursPerPeriod}
                  onChangeText={setHoursPerPeriod}
                  keyboardType="decimal-pad"
                  placeholder="40"
                />
              </>
            )}

            <Text style={styles.label}>Pay frequency</Text>
            <View style={styles.typeRow}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.typeButton, frequency === f.key && styles.typeActive]}
                  onPress={() => setFrequency(f.key)}
                >
                  <Text style={frequency === f.key ? styles.typeActiveText : styles.typeText}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {renderFrequencyFields()}

            <Text style={styles.label}>First pay date / cycle start</Text>
            <TextInput
              style={styles.field}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />

            <TouchableOpacity style={styles.button} onPress={handleSaveSource}>
              <Text style={styles.buttonText}>
                {editingSourceId ? 'Update income source' : 'Save income source'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {sources.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No income sources yet.</Text>
          </View>
        ) : (
          sources.map((source) => (
            <View key={source.id} style={styles.sourceCard}>
              <View style={styles.sourceHeader}>
                <View>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  <Text style={styles.sourceMeta}>
                    {source.frequency} • {source.incomeType} •{' '}
                    {formatCurrency(getPeriodAmount(source))}/period
                  </Text>
                </View>
                <View style={styles.sourceActions}>
                  <Switch value={source.active} onValueChange={() => toggleActive(source.id)} />
                  <View style={styles.sourceActionButtons}>
                    <TouchableOpacity onPress={() => handleEditSource(source)}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(source.id)}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text style={styles.sourceDetail}>Started {displayDate(source.startDate)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Projected paychecks</Text>
        {projectedPeriods.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No projected paychecks for this month.</Text>
          </View>
        ) : (
          projectedPeriods.map((period) => (
            <TouchableOpacity
              key={`${period.sourceId}-${period.payDate}`}
              style={styles.paycheckCard}
              onPress={() => openPaycheckEdit(period)}
              disabled={period.isRealized}
            >
              <View style={styles.paycheckRow}>
                <Text style={styles.paycheckSource}>{period.sourceName}</Text>
                <Text style={styles.paycheckAmount}>{formatCurrency(period.effectiveAmount)}</Text>
              </View>
              <Text style={styles.paycheckDate}>
                Pay {displayDate(period.payDate)} · Period {displayDate(period.periodStart)}–
                {displayDate(period.periodEnd)}
              </Text>
              {period.isRealized ? (
                <Text style={styles.realizedTag}>Realized income recorded</Text>
              ) : period.isManual ? (
                <Text style={styles.manualTag}>Manual estimate · tap to edit</Text>
              ) : (
                <Text style={styles.projectedTag}>Tap to estimate</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={editPeriod !== null}
        onRequestClose={closePaycheckEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit paycheck estimate</Text>
            <Text style={styles.modalSubtitle}>
              {editPeriod
                ? `${editPeriod.sourceName} · Pay ${displayDate(editPeriod.payDate)}`
                : ''}
            </Text>

            <Text style={styles.label}>Estimated amount</Text>
            <TextInput
              style={styles.field}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              autoFocus
            />

            <TouchableOpacity style={styles.button} onPress={handleSaveOverride}>
              <Text style={styles.buttonText}>Save estimate</Text>
            </TouchableOpacity>

            {editPeriod?.isManual && (
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={handleRemoveOverride}
              >
                <Text style={styles.buttonText}>Revert to source estimate</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={closePaycheckEdit}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthButtonText: {
    fontSize: 20,
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
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  positive: {
    color: '#28a745',
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  smallButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  formCard: {
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  flex: {
    flex: 1,
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
    backgroundColor: '#f8f9fa',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  typeActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeText: {
    color: '#495057',
    fontSize: 13,
  },
  typeActiveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyText: {
    color: '#6c757d',
  },
  sourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sourceMeta: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  sourceDetail: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
  },
  sourceActions: {
    alignItems: 'center',
    gap: 8,
  },
  sourceActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  editButtonText: {
    color: '#007bff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '600',
  },
  paycheckCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paycheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paycheckSource: {
    fontSize: 14,
    fontWeight: '600',
  },
  paycheckAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  paycheckDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  realizedTag: {
    fontSize: 11,
    color: '#28a745',
    marginTop: 4,
    fontWeight: '600',
  },
  manualTag: {
    fontSize: 11,
    color: '#007bff',
    marginTop: 4,
    fontWeight: '600',
  },
  projectedTag: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 16,
  },
});
