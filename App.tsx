import './global.css';

import { BricolageGrotesque_700Bold, useFonts } from '@expo-google-fonts/bricolage-grotesque';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
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
  const [fontsLoaded] = useFonts({ BricolageGrotesque_700Bold });
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

  if (!fontsLoaded) {
    return <View className="flex-1 bg-midnight" />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-midnight">
        <View className="flex-1">{renderContent()}</View>

        <View className="absolute bottom-5 left-5 right-5 flex-row items-center rounded-full border border-white/10 bg-surface/95 p-2 shadow-lg">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="flex-1 items-center justify-center py-2.5"
              >
                <View
                  className={
                    isActive
                      ? 'items-center justify-center rounded-full bg-mint/15 px-3.5 py-1.5'
                      : 'items-center justify-center px-3.5 py-1.5'
                  }
                >
                  <Ionicons
                    name={(isActive ? tab.activeIcon : tab.icon) as any}
                    size={19}
                    color={isActive ? '#13d97f' : '#8b939f'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
