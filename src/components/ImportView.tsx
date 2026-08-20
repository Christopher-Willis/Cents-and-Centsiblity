import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { BudgetCategory, Transaction, TransactionType } from '../types';
import { parseCsv } from '../utils/csv';
import { pickAndReadCsv } from '../utils/fileReader';
import Button from './ui/Button';
import Card from './ui/Card';
import Chip from './ui/Chip';
import FormField from './ui/FormField';
import ScreenScroll from './ui/ScreenScroll';

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
    <ScreenScroll title="Import Transactions">
      <Card className="mb-4 p-4">
        <Text className="text-lg font-semibold mb-2 text-ink">Manual CSV upload</Text>
        <Text className="text-[13px] text-ink-muted mb-3">
          CSV must have columns: date, description, amount. Optional: type, category.
        </Text>

        <Button label="Select CSV file" onPress={handlePickFile} className="mb-3 py-3 px-4" />

        <FormField
          value={csvText}
          onChangeText={setCsvText}
          placeholder="Or paste CSV here..."
          multiline
          numberOfLines={6}
          inputClassName="min-h-[100px]"
          inputStyle={{ textAlignVertical: 'top' }}
          className="mb-3"
        />

        <Button
          label="Preview"
          onPress={() => handleParse(csvText)}
          variant="secondary"
          className="mb-3 py-3 px-4"
        />

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
            <Button
              label="Add to transactions"
              onPress={handleAddPreview}
              disabled={preview.length === 0}
              className="mb-3 py-3 px-4"
            />
          </View>
        )}
      </Card>

      <Card className="mb-4 p-4">
        <Text className="text-lg font-semibold mb-2 text-ink">Add one manually</Text>

        <FormField
          label="Date"
          value={manualDate}
          onChangeText={setManualDate}
          placeholder="YYYY-MM-DD"
        />

        <FormField
          label="Description"
          value={manualDescription}
          onChangeText={setManualDescription}
          placeholder="Coffee, paycheck, etc."
        />

        <FormField
          label="Amount"
          value={manualAmount}
          onChangeText={setManualAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text className="text-[13px] font-semibold text-ink-muted mb-1">Type</Text>
        <View className="flex-row gap-2 mb-3">
          <Chip
            label="Expense"
            selected={manualType === 'expense'}
            onPress={() => setManualType('expense')}
            pill={false}
            className="flex-1 items-center p-2.5"
          />
          <Chip
            label="Income"
            selected={manualType === 'income'}
            onPress={() => setManualType('income')}
            pill={false}
            className="flex-1 items-center p-2.5"
          />
        </View>

        {manualType === 'expense' && (
          <>
            <Text className="text-[13px] font-semibold text-ink-muted mb-1">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {expenseCategories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  selected={manualCategoryId === category.id}
                  onPress={() => setManualCategoryId(category.id)}
                  className="py-1.5 px-3"
                />
              ))}
            </View>
          </>
        )}

        <Button label="Add transaction" onPress={handleAddManual} className="mb-3 py-3 px-4" />
      </Card>

      <Card className="mb-4 p-4 opacity-80">
        <Text className="text-lg font-semibold mb-2 text-ink">External sync</Text>
        <Text className="text-[13px] text-ink-muted mb-3">
          Bank sync (Plaid, etc.) is not connected yet. This module will be expanded as support is
          added.
        </Text>
      </Card>
    </ScreenScroll>
  );
}
