import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Import Transactions</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Manual CSV upload</Text>
        <Text style={styles.hint}>
          CSV must have columns: date, description, amount. Optional: type, category.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handlePickFile}>
          <Text style={styles.buttonText}>Select CSV file</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          multiline
          numberOfLines={6}
          placeholder="Or paste CSV here..."
          value={csvText}
          onChangeText={setCsvText}
        />

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => handleParse(csvText)}
        >
          <Text style={styles.buttonText}>Preview</Text>
        </TouchableOpacity>

        {parseErrors.length > 0 && (
          <View style={styles.errors}>
            {parseErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                {error}
              </Text>
            ))}
          </View>
        )}

        {preview && (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              {preview.length} transaction{preview.length === 1 ? '' : 's'} ready to import
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={handleAddPreview}
              disabled={preview.length === 0}
            >
              <Text style={styles.buttonText}>Add to transactions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add one manually</Text>

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.field}
          value={manualDate}
          onChangeText={setManualDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.field}
          value={manualDescription}
          onChangeText={setManualDescription}
          placeholder="Coffee, paycheck, etc."
        />

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.field}
          value={manualAmount}
          onChangeText={setManualAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, manualType === 'expense' && styles.typeActive]}
            onPress={() => setManualType('expense')}
          >
            <Text style={manualType === 'expense' ? styles.typeActiveText : styles.typeText}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, manualType === 'income' && styles.typeActive]}
            onPress={() => setManualType('income')}
          >
            <Text style={manualType === 'income' ? styles.typeActiveText : styles.typeText}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {manualType === 'expense' && (
          <>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {expenseCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    manualCategoryId === category.id && styles.categoryActive,
                  ]}
                  onPress={() => setManualCategoryId(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      manualCategoryId === category.id && styles.categoryActiveText,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleAddManual}>
          <Text style={styles.buttonText}>Add transaction</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.placeholderCard]}>
        <Text style={styles.sectionTitle}>External sync</Text>
        <Text style={styles.hint}>
          Bank sync (Plaid, etc.) is not connected yet. This module will be expanded as support is
          added.
        </Text>
      </View>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  field: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  errors: {
    marginBottom: 12,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 13,
  },
  preview: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
  },
  previewText: {
    marginBottom: 8,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  typeActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeText: {
    color: '#495057',
  },
  typeActiveText: {
    color: '#fff',
    fontWeight: '600',
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
  placeholderCard: {
    opacity: 0.8,
  },
});
