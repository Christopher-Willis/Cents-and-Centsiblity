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
    <ScrollView className="flex-1 bg-[#f8f9fa]" contentContainerClassName="p-4 pb-8">
      <Text className="text-2xl font-bold mb-4">Import Transactions</Text>

      <View className="bg-white rounded-xl p-4 mb-4 border border-[#e9ecef]">
        <Text className="text-lg font-semibold mb-2">Manual CSV upload</Text>
        <Text className="text-[13px] text-[#6c757d] mb-3">
          CSV must have columns: date, description, amount. Optional: type, category.
        </Text>

        <TouchableOpacity
          className="bg-[#007bff] rounded-lg py-3 px-4 items-center mb-3"
          onPress={handlePickFile}
        >
          <Text className="text-white font-semibold">Select CSV file</Text>
        </TouchableOpacity>

        <TextInput
          className="border border-[#dee2e6] rounded-lg p-3 min-h-[100px] mb-3 bg-[#f8f9fa]"
          style={{ textAlignVertical: 'top' }}
          multiline
          numberOfLines={6}
          placeholder="Or paste CSV here..."
          value={csvText}
          onChangeText={setCsvText}
        />

        <TouchableOpacity
          className="bg-[#6c757d] rounded-lg py-3 px-4 items-center mb-3"
          onPress={() => handleParse(csvText)}
        >
          <Text className="text-white font-semibold">Preview</Text>
        </TouchableOpacity>

        {parseErrors.length > 0 && (
          <View className="mb-3">
            {parseErrors.map((error, index) => (
              <Text key={index} className="text-[#dc3545] text-[13px]">
                {error}
              </Text>
            ))}
          </View>
        )}

        {preview && (
          <View className="bg-[#e9ecef] rounded-lg p-3">
            <Text className="mb-2 font-semibold">
              {preview.length} transaction{preview.length === 1 ? '' : 's'} ready to import
            </Text>
            <TouchableOpacity
              className="bg-[#28a745] rounded-lg py-3 px-4 items-center mb-3"
              onPress={handleAddPreview}
              disabled={preview.length === 0}
            >
              <Text className="text-white font-semibold">Add to transactions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="bg-white rounded-xl p-4 mb-4 border border-[#e9ecef]">
        <Text className="text-lg font-semibold mb-2">Add one manually</Text>

        <Text className="text-[13px] font-semibold text-[#495057] mb-1">Date</Text>
        <TextInput
          className="border border-[#dee2e6] rounded-lg p-3 mb-3 bg-[#f8f9fa]"
          value={manualDate}
          onChangeText={setManualDate}
          placeholder="YYYY-MM-DD"
        />

        <Text className="text-[13px] font-semibold text-[#495057] mb-1">Description</Text>
        <TextInput
          className="border border-[#dee2e6] rounded-lg p-3 mb-3 bg-[#f8f9fa]"
          value={manualDescription}
          onChangeText={setManualDescription}
          placeholder="Coffee, paycheck, etc."
        />

        <Text className="text-[13px] font-semibold text-[#495057] mb-1">Amount</Text>
        <TextInput
          className="border border-[#dee2e6] rounded-lg p-3 mb-3 bg-[#f8f9fa]"
          value={manualAmount}
          onChangeText={setManualAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text className="text-[13px] font-semibold text-[#495057] mb-1">Type</Text>
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            className={`flex-1 rounded-lg p-2.5 items-center border ${
              manualType === 'expense' ? 'bg-[#007bff] border-[#007bff]' : 'border-[#dee2e6]'
            }`}
            onPress={() => setManualType('expense')}
          >
            <Text
              className={manualType === 'expense' ? 'text-white font-semibold' : 'text-[#495057]'}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 rounded-lg p-2.5 items-center border ${
              manualType === 'income' ? 'bg-[#007bff] border-[#007bff]' : 'border-[#dee2e6]'
            }`}
            onPress={() => setManualType('income')}
          >
            <Text
              className={manualType === 'income' ? 'text-white font-semibold' : 'text-[#495057]'}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {manualType === 'expense' && (
          <>
            <Text className="text-[13px] font-semibold text-[#495057] mb-1">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {expenseCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  className={`rounded-2xl py-1.5 px-3 border ${
                    manualCategoryId === category.id
                      ? 'bg-[#007bff] border-[#007bff]'
                      : 'border-[#dee2e6]'
                  }`}
                  onPress={() => setManualCategoryId(category.id)}
                >
                  <Text
                    className={`text-[13px] ${
                      manualCategoryId === category.id
                        ? 'text-white font-semibold'
                        : 'text-[#495057]'
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
          className="bg-[#007bff] rounded-lg py-3 px-4 items-center mb-3"
          onPress={handleAddManual}
        >
          <Text className="text-white font-semibold">Add transaction</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-xl p-4 mb-4 border border-[#e9ecef] opacity-80">
        <Text className="text-lg font-semibold mb-2">External sync</Text>
        <Text className="text-[13px] text-[#6c757d] mb-3">
          Bank sync (Plaid, etc.) is not connected yet. This module will be expanded as support is
          added.
        </Text>
      </View>
    </ScrollView>
  );
}
