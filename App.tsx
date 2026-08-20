import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BillsView from './src/components/BillsView';
import BudgetView from './src/components/BudgetView';
import Dashboard from './src/components/Dashboard';
import EarningsView from './src/components/EarningsView';
import ImportView from './src/components/ImportView';
import TransactionList from './src/components/TransactionList';
import { DEFAULT_CATEGORIES } from './src/data/categories';
import { usePersistentState } from './src/hooks/usePersistentState';
import { Bill, BudgetCategory, IncomeSource, Tab, Transaction } from './src/types';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Home' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'budget', label: 'Budget' },
  { key: 'bills', label: 'Bills' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'import', label: 'Import' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = usePersistentState<Transaction[]>('transactions', []);
  const [categories, setCategories] = usePersistentState<BudgetCategory[]>('categories', DEFAULT_CATEGORIES);
  const [bills, setBills] = usePersistentState<Bill[]>('bills', []);
  const [incomeSources, setIncomeSources] = usePersistentState<IncomeSource[]>('incomeSources', []);

  const handleImport = (newTransactions: Transaction[]) => {
    setTransactions((prev) => [...prev, ...newTransactions]);
    setActiveTab('transactions');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            transactions={transactions}
            categories={categories}
            onImportPress={() => setActiveTab('import')}
          />
        );
      case 'transactions':
        return <TransactionList transactions={transactions} categories={categories} />;
      case 'budget':
        return (
          <BudgetView
            transactions={transactions}
            categories={categories}
            bills={bills}
            onCategoriesChange={setCategories}
          />
        );
      case 'bills':
        return <BillsView bills={bills} categories={categories} onBillsChange={setBills} />;
      case 'earnings':
        return (
          <EarningsView
            transactions={transactions}
            categories={categories}
            sources={incomeSources}
            onSourcesChange={setIncomeSources}
          />
        );
      case 'import':
        return <ImportView categories={categories} onImport={handleImport} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>{renderContent()}</View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#007bff',
  },
  tabText: {
    fontSize: 12,
    color: '#6c757d',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
});
