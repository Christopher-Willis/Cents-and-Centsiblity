import './global.css';

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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

const TABS: { key: Tab; label: string; icon: string; activeIcon: string }[] = [
  { key: 'dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  {
    key: 'transactions',
    label: 'Activity',
    icon: 'swap-horizontal-outline',
    activeIcon: 'swap-horizontal',
  },
  { key: 'budget', label: 'Budget', icon: 'wallet-outline', activeIcon: 'wallet' },
  { key: 'bills', label: 'Bills', icon: 'receipt-outline', activeIcon: 'receipt' },
  { key: 'earnings', label: 'Earn', icon: 'cash-outline', activeIcon: 'cash' },
  { key: 'import', label: 'Import', icon: 'download-outline', activeIcon: 'download' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = usePersistentState<Transaction[]>('transactions', []);
  const [categories, setCategories] = usePersistentState<BudgetCategory[]>(
    'categories',
    DEFAULT_CATEGORIES,
  );
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
      <SafeAreaView className="flex-1 bg-[#f8f9fa]">
        <View className="flex-1">{renderContent()}</View>

        <View className="flex-row bg-white border-t border-t-[#dee2e6] pb-2 pt-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                className={`flex-1 items-center py-1.5 ${isActive ? 'border-t-2 border-t-[#007bff]' : ''}`}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={(isActive ? tab.activeIcon : tab.icon) as any}
                  size={22}
                  color={isActive ? '#007bff' : '#6c757d'}
                  className="mb-0.5"
                />
                <Text
                  className={`text-[10px] ${isActive ? 'text-[#007bff] font-semibold' : 'text-[#6c757d]'}`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
