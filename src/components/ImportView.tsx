import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BudgetCategory, Transaction, TransactionType } from '../types';
import { parseCsv } from '../utils/csv';
import { pickAndReadCsv } from '../utils/fileReader';

interface ImportViewProps {
  categories: BudgetCategory[];
  onImport: (transactions: Transaction[]) => void;
}

export default function ImportView({ categories, onImport }: ImportViewProps) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<Transaction[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDescription, setManualDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<TransactionType>('expense');
  const [manualCategoryId, setManualCategoryId] = useState(
    categories.find((c) => c.id !== 'income')?.id ?? '',
  );

  const handlePickFile = async () => {
    try {
      const result = await pickAndReadCsv();
      if (result) {
        setCsvText(result.content);
        handleParse(result.content);
      }
    } catch (error) {
      Alert.alert('Import error', error instanceof Error ? error.message : 'Could not read file');
    }
  };

  const handleParse = (text: string) => {
    const { transactions, errors } = parseCsv(text, categories, 'csv');
    setPreview(transactions);
    setParseErrors(errors);
  };

  const handleAddPreview = () => {
    if (preview && preview.length > 0) {
      onImport(preview);
      setCsvText('');
      setPreview(null);
      setParseErrors([]);
    }
  };

  const handleAddManual = () => {
    const amount = Number.parseFloat(manualAmount);
    if (!manualDescription || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid entry', 'Please enter a description and a positive amount.');
      return;
    }

    const date = new Date(manualDate);
    if (Number.isNaN(date.getTime())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
      return;
    }

    const transaction: Transaction = {
      id: `${Date.now()}-manual`,
      date: date.toISOString(),
      description: manualDescription,
      amount,
      type: manualType,
      categoryId: manualType === 'income' ? 'income' : manualCategoryId,
      source: 'manual',
    };

    onImport([transaction]);
    setManualDescription('');
    setManualAmount('');
  };

  const expenseCategories = categories.filter((c) => c.id !== 'income');

  return (
    <ScrollView className="flex-1 bg-midnight" contentContainerClassName="p-4 pb-32">
      <Text className="text-2xl font-bold mb-4 text-ink">Import Transactions</Text>

      <View className="bg-surface rounded-xl p-4 mb-4 border border-white/[0.06]">
        <Text className="text-lg font-semibold mb-2 text-ink">Manual CSV upload</Text>
        <Text className="text-[13px] text-ink-muted mb-3">
          CSV must have columns: date, description, amount. Optional: type, category.
        </Text>

        <TouchableOpacity
          className="bg-mint rounded-lg py-3 px-4 items-center mb-3"
          onPress={handlePickFile}
        >
          <Text className="text-midnight font-semibold">Select CSV file</Text>
        </TouchableOpacity>

        <TextInput
          className="border border-white/10 rounded-lg p-3 min-h-[100px] mb-3 bg-surface2 text-ink"
          style={{ textAlignVertical: 'top' }}
          multiline
          numberOfLines={6}
          placeholder="Or paste CSV here..."
          placeholderTextColor="#8b939f"
          value={csvText}
          onChangeText={setCsvText}
        />

        <TouchableOpacity
          className="bg-surface2 rounded-lg py-3 px-4 items-center mb-3"
          onPress={() => handleParse(csvText)}
        >
          <Text className="text-ink font-semibold">Preview</Text>
        </TouchableOpacity>

        {parseErrors.length > 0 && (
          <View className="mb-3">
            {parseErrors.map((error, index) => (
              <Text key={index} className="text-coral text-[13px]">
                {error}
              </Text>
            ))}
          </View>
        )}

        {preview && (
          <View className="bg-surface2 rounded-lg p-3">
            <Text className="mb-2 font-semibold text-ink">
              {preview.length} transaction{preview.length === 1 ? '' : 's'} ready to import
            </Text>
            <TouchableOpacity
              className="bg-mint rounded-lg py-3 px-4 items-center mb-3"
              onPress={handleAddPreview}
              disabled={preview.length === 0}
            >
              <Text className="text-midnight font-semibold">Add to transactions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="bg-surface rounded-xl p-4 mb-4 border border-white/[0.06]">
        <Text className="text-lg font-semibold mb-2 text-ink">Add one manually</Text>

        <Text className="text-[13px] font-semibold text-ink-muted mb-1">Date</Text>
        <TextInput
          className="border border-white/10 rounded-xl px-3 py-2.5 mb-3 bg-surface2 text-ink"
          value={manualDate}
          onChangeText={setManualDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8b939f"
        />

        <Text className="text-[13px] font-semibold text-ink-muted mb-1">Description</Text>
        <TextInput
          className="border border-white/10 rounded-xl px-3 py-2.5 mb-3 bg-surface2 text-ink"
          value={manualDescription}
          onChangeText={setManualDescription}
          placeholder="Coffee, paycheck, etc."
          placeholderTextColor="#8b939f"
        />

        <Text className="text-[13px] font-semibold text-ink-muted mb-1">Amount</Text>
        <TextInput
          className="border border-white/10 rounded-xl px-3 py-2.5 mb-3 bg-surface2 text-ink"
          value={manualAmount}
          onChangeText={setManualAmount}
          placeholder="0.00"
          placeholderTextColor="#8b939f"
          keyboardType="decimal-pad"
        />

        <Text className="text-[13px] font-semibold text-ink-muted mb-1">Type</Text>
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            className={`flex-1 rounded-lg p-2.5 items-center border ${
              manualType === 'expense' ? 'bg-mint border-mint' : 'bg-surface2 border-white/10'
            }`}
            onPress={() => setManualType('expense')}
          >
            <Text
              className={
                manualType === 'expense' ? 'text-midnight font-semibold' : 'text-ink-muted'
              }
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 rounded-lg p-2.5 items-center border ${
              manualType === 'income' ? 'bg-mint border-mint' : 'bg-surface2 border-white/10'
            }`}
            onPress={() => setManualType('income')}
          >
            <Text
              className={manualType === 'income' ? 'text-midnight font-semibold' : 'text-ink-muted'}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {manualType === 'expense' && (
          <>
            <Text className="text-[13px] font-semibold text-ink-muted mb-1">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {expenseCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  className={`rounded-2xl py-1.5 px-3 border ${
                    manualCategoryId === category.id
                      ? 'bg-mint border-mint'
                      : 'bg-surface2 border-white/10'
                  }`}
                  onPress={() => setManualCategoryId(category.id)}
                >
                  <Text
                    className={`text-[13px] ${
                      manualCategoryId === category.id
                        ? 'text-midnight font-semibold'
                        : 'text-ink-muted'
                    }`}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          className="bg-mint rounded-lg py-3 px-4 items-center mb-3"
          onPress={handleAddManual}
        >
          <Text className="text-midnight font-semibold">Add transaction</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-surface rounded-xl p-4 mb-4 border border-white/[0.06] opacity-80">
        <Text className="text-lg font-semibold mb-2 text-ink">External sync</Text>
        <Text className="text-[13px] text-ink-muted mb-3">
          Bank sync (Plaid, etc.) is not connected yet. This module will be expanded as support is
          added.
        </Text>
      </View>
    </ScrollView>
  );
}
