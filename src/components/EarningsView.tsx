import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
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
        <View className="mb-3">
          <Text className="text-[13px] font-semibold text-[#495057] mb-1">Pay day of month</Text>
          <TextInput
            className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
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
        <View className="flex-row gap-3">
          <View className="mb-3 flex-1">
            <Text className="text-[13px] font-semibold text-[#495057] mb-1">First pay day</Text>
            <TextInput
              className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
              value={semiDay1}
              onChangeText={setSemiDay1}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
          <View className="mb-3 flex-1">
            <Text className="text-[13px] font-semibold text-[#495057] mb-1">Second pay day</Text>
            <TextInput
              className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
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
    <ScrollView className="flex-1 bg-[#f8f9fa]" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold mb-4">Earnings</Text>

      <View className="flex-row justify-between items-center bg-white rounded-xl p-3 mb-4 border border-[#e9ecef]">
        <TouchableOpacity className="px-4 py-2" onPress={handlePrevMonth}>
          <Text className="text-xl font-bold text-[#007bff]">{'<'}</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold">{monthName(year, month)}</Text>
        <TouchableOpacity className="px-4 py-2" onPress={handleNextMonth}>
          <Text className="text-xl font-bold text-[#007bff]">{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="bg-white rounded-xl p-4 border border-[#e9ecef] flex-1 items-center">
          <Text className="text-[13px] font-semibold text-[#495057] mb-1">Real income</Text>
          <Text className="text-lg font-bold mt-1">{formatCurrency(realIncome)}</Text>
        </View>
        <View className="bg-white rounded-xl p-4 border border-[#e9ecef] flex-1 items-center">
          <Text className="text-[13px] font-semibold text-[#495057] mb-1">Projected</Text>
          <Text className="text-lg font-bold mt-1">{formatCurrency(remainingProjected)}</Text>
        </View>
        <View className="bg-white rounded-xl p-4 border border-[#e9ecef] flex-1 items-center">
          <Text className="text-[13px] font-semibold text-[#495057] mb-1">Total expected</Text>
          <Text className="text-lg font-bold mt-1 text-[#28a745]">
            {formatCurrency(totalExpected)}
          </Text>
        </View>
      </View>

      <View className="mt-2 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold">Income sources</Text>
          <TouchableOpacity className="bg-[#007bff] rounded-lg py-2 px-3" onPress={toggleForm}>
            <Text className="text-white font-semibold text-[13px]">
              {showForm ? 'Cancel' : 'Add source'}
            </Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View className="bg-white rounded-xl p-4 border border-[#e9ecef] mb-4">
            <Text className="text-[13px] font-semibold text-[#495057] mb-1">Source name</Text>
            <TextInput
              className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
              value={name}
              onChangeText={setName}
              placeholder="Day job, freelance, etc."
            />

            <Text className="text-[13px] font-semibold text-[#495057] mb-1">Income type</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {INCOME_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  className={`border rounded-lg py-2.5 px-3 ${incomeType === type.key ? 'bg-[#007bff] border-[#007bff]' : 'border-[#dee2e6]'}`}
                  onPress={() => setIncomeType(type.key)}
                >
                  <Text
                    className={
                      incomeType === type.key
                        ? 'text-white font-semibold text-[13px]'
                        : 'text-[#495057] text-[13px]'
                    }
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-[13px] font-semibold text-[#495057] mb-1">
              {incomeType === 'hourly' ? 'Hourly rate' : 'Amount per paycheck'}
            </Text>
            <TextInput
              className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            {incomeType === 'hourly' && (
              <>
                <Text className="text-[13px] font-semibold text-[#495057] mb-1">
                  Expected hours per period
                </Text>
                <TextInput
                  className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
                  value={hoursPerPeriod}
                  onChangeText={setHoursPerPeriod}
                  keyboardType="decimal-pad"
                  placeholder="40"
                />
              </>
            )}

            <Text className="text-[13px] font-semibold text-[#495057] mb-1">Pay frequency</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  className={`border rounded-lg py-2.5 px-3 ${frequency === f.key ? 'bg-[#007bff] border-[#007bff]' : 'border-[#dee2e6]'}`}
                  onPress={() => setFrequency(f.key)}
                >
                  <Text
                    className={
                      frequency === f.key
                        ? 'text-white font-semibold text-[13px]'
                        : 'text-[#495057] text-[13px]'
                    }
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {renderFrequencyFields()}

            <Text className="text-[13px] font-semibold text-[#495057] mb-1">
              First pay date / cycle start
            </Text>
            <TextInput
              className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />

            <TouchableOpacity
              className="bg-[#007bff] rounded-lg py-3 px-4 items-center mt-2"
              onPress={handleSaveSource}
            >
              <Text className="text-white font-semibold">
                {editingSourceId ? 'Update income source' : 'Save income source'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {sources.length === 0 ? (
          <View className="bg-white rounded-xl p-6 items-center border border-[#e9ecef]">
            <Text className="text-[#6c757d]">No income sources yet.</Text>
          </View>
        ) : (
          sources.map((source) => (
            <View key={source.id} className="bg-white rounded-xl p-4 mb-3 border border-[#e9ecef]">
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-base font-semibold">{source.name}</Text>
                  <Text className="text-[13px] text-[#6c757d] mt-0.5">
                    {source.frequency} • {source.incomeType} •{' '}
                    {formatCurrency(getPeriodAmount(source))}/period
                  </Text>
                </View>
                <View className="items-center gap-2">
                  <Switch value={source.active} onValueChange={() => toggleActive(source.id)} />
                  <View className="flex-row gap-3 mt-1">
                    <TouchableOpacity onPress={() => handleEditSource(source)}>
                      <Text className="text-[#007bff] text-xs font-semibold">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(source.id)}>
                      <Text className="text-[#dc3545] text-xs font-semibold">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text className="text-xs text-[#6c757d] mt-2">
                Started {displayDate(source.startDate)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-2 mb-4">
        <Text className="text-lg font-semibold">Projected paychecks</Text>
        {projectedPeriods.length === 0 ? (
          <View className="bg-white rounded-xl p-6 items-center border border-[#e9ecef]">
            <Text className="text-[#6c757d]">No projected paychecks for this month.</Text>
          </View>
        ) : (
          projectedPeriods.map((period) => (
            <TouchableOpacity
              key={`${period.sourceId}-${period.payDate}`}
              className="bg-white rounded-xl p-3 mb-2 border border-[#e9ecef]"
              onPress={() => openPaycheckEdit(period)}
              disabled={period.isRealized}
            >
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-semibold">{period.sourceName}</Text>
                <Text className="text-sm font-bold">{formatCurrency(period.effectiveAmount)}</Text>
              </View>
              <Text className="text-xs text-[#6c757d] mt-1">
                Pay {displayDate(period.payDate)} · Period {displayDate(period.periodStart)}–
                {displayDate(period.periodEnd)}
              </Text>
              {period.isRealized ? (
                <Text className="text-[11px] text-[#28a745] mt-1 font-semibold">
                  Realized income recorded
                </Text>
              ) : period.isManual ? (
                <Text className="text-[11px] text-[#007bff] mt-1 font-semibold">
                  Manual estimate · tap to edit
                </Text>
              ) : (
                <Text className="text-[11px] text-[#6c757d] mt-1 font-semibold">
                  Tap to estimate
                </Text>
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
        <View className="flex-1 justify-center items-center bg-black/40 p-4">
          <View className="w-full max-w-[400px] bg-white rounded-2xl p-5 border border-[#e9ecef]">
            <Text className="text-lg font-bold mb-1">Edit paycheck estimate</Text>
            <Text className="text-[13px] text-[#6c757d] mb-4">
              {editPeriod
                ? `${editPeriod.sourceName} · Pay ${displayDate(editPeriod.payDate)}`
                : ''}
            </Text>

            <Text className="text-[13px] font-semibold text-[#495057] mb-1">Estimated amount</Text>
            <TextInput
              className="border border-[#dee2e6] rounded-lg p-3 bg-[#f8f9fa]"
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              autoFocus
            />

            <TouchableOpacity
              className="bg-[#007bff] rounded-lg py-3 px-4 items-center mt-2"
              onPress={handleSaveOverride}
            >
              <Text className="text-white font-semibold">Save estimate</Text>
            </TouchableOpacity>

            {editPeriod?.isManual && (
              <TouchableOpacity
                className="bg-[#dc3545] rounded-lg py-3 px-4 items-center mt-2"
                onPress={handleRemoveOverride}
              >
                <Text className="text-white font-semibold">Revert to source estimate</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="bg-[#6c757d] rounded-lg py-3 px-4 items-center mt-2"
              onPress={closePaycheckEdit}
            >
              <Text className="text-white font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
