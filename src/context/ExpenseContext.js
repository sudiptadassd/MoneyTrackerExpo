import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ExpenseContext = createContext();

const STORAGE_KEY = 'expense_tracker_data';

const DEFAULT_SETTINGS = {
  currency: '\u20B9',
  darkMode: Appearance.getColorScheme() === 'dark',
};

/* Simple ID generator (Date-based) - same as the web app */
const generateId = () => {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};

export const ExpenseProvider = ({ children }) => {
  const [capitals, setCapitals] = useState([]);
  const [fund, setFund] = useState([]);
  const [sources, setSources] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Persistence: load once on mount
  useEffect(() => {
    (async () => {
      try {
        const storedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          setCapitals(parsed.capitals || []);
          setFund(parsed.fund || []);
          setSources(parsed.sources || []);
          setExpenses(parsed.expenses || []);
          setTransactions(parsed.transactions || []);
          setSettings(parsed.settings || DEFAULT_SETTINGS);
        }
      } catch (e) {
        console.error('Failed to load data', e);
      }
      setIsInitialized(true);
    })();
  }, []);

  // Persistence: save after every change (once initialized)
  useEffect(() => {
    if (!isInitialized) return;
    (async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            capitals,
            fund,
            sources,
            expenses,
            transactions,
            settings,
          })
        );
      } catch (e) {
        console.error('Failed to save data', e);
      }
    })();
  }, [capitals, fund, sources, expenses, transactions, settings, isInitialized]);

  // Balance Calculation Utils
  const getCapitalBalance = (capitalId) => {
    const capitalSources = sources.filter((s) => s.capitalId === capitalId);
    const capitalExpenses = expenses.filter((e) => e.capitalId === capitalId);

    const totalCredit = capitalSources.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalDebit = capitalExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return totalCredit - totalDebit;
  };

  const getInitialBalance = (capitalId) => {
    const capitalSources = sources.filter((s) => s.capitalId === capitalId);
    return capitalSources.reduce((sum, s) => sum + Number(s.amount), 0);
  };

  const getTotalBalance = () => {
    return capitals.reduce((sum, capital) => sum + getCapitalBalance(capital.id), 0);
  };

  // Actions
  const addCapital = (name, color = 'blue') => {
    const newCapital = {
      id: generateId(),
      name,
      color,
      createdAt: new Date().toISOString(),
    };
    setCapitals((prev) => [...prev, newCapital]);
    return newCapital;
  };

  const addSource = (capitalId, title, breakdown, amount) => {
    const beforeBalance = getCapitalBalance(capitalId);
    const newSource = {
      id: generateId(),
      capitalId,
      title,
      breakdown,
      amount: Number(amount),
      date: new Date().toISOString(),
    };

    const newTransaction = {
      id: generateId(),
      type: 'CREDIT',
      capitalId,
      amount: Number(amount),
      balanceBefore: beforeBalance,
      balanceAfter: beforeBalance + Number(amount),
      date: new Date().toISOString(),
      note: title,
      breakdown,
      referenceId: newSource.id,
    };

    setSources((prev) => [...prev, newSource]);
    setTransactions((prev) => [newTransaction, ...prev]);

    return newSource;
  };

  const updateSource = (sourceId, title, breakdown, amount) => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return;

    const newAmount = Number(amount);

    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, title, breakdown, amount: newAmount } : s
      )
    );

    setTransactions((prev) =>
      prev.map((t) => {
        if (t.referenceId === sourceId) {
          return {
            ...t,
            note: title,
            breakdown,
            amount: newAmount,
            balanceAfter: t.balanceBefore + newAmount,
          };
        }
        return t;
      })
    );
  };

  const addExpense = (capitalId, title, reason, amount, sourceId = null) => {
    const beforeBalance = getCapitalBalance(capitalId);
    const expenseAmount = Number(amount);

    // Prevent negative balance
    if (beforeBalance - expenseAmount < 0) {
      throw new Error(
        `Insufficient balance! Current balance: ${beforeBalance.toLocaleString()}, Required: ${expenseAmount.toLocaleString()}`
      );
    }

    const newExpense = {
      id: generateId(),
      capitalId,
      sourceId: sourceId || null,
      title,
      reason,
      amount: expenseAmount,
      date: new Date().toISOString(),
      beforeBalance,
      afterBalance: beforeBalance - expenseAmount,
    };

    const newTransaction = {
      id: generateId(),
      type: 'DEBIT',
      capitalId,
      sourceId: sourceId || null,
      amount: expenseAmount,
      balanceBefore: beforeBalance,
      balanceAfter: beforeBalance - expenseAmount,
      date: new Date().toISOString(),
      note: title,
      breakdown: reason,
      referenceId: newExpense.id,
    };

    setExpenses((prev) => [...prev, newExpense]);
    setTransactions((prev) => [newTransaction, ...prev]);

    return newExpense;
  };

  const updateCapital = (id, name, color) => {
    setCapitals((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name, color } : c))
    );
  };

  const deleteCapital = (id) => {
    const capitalToDelete = capitals.find((c) => c.id === id);
    if (!capitalToDelete) return;

    // Remove capital but preserve all transaction records
    setCapitals((prev) => prev.filter((c) => c.id !== id));

    // Tag all transactions from this capital
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.capitalId === id) {
          return {
            ...t,
            capitalName: capitalToDelete.name,
            deletedTag: `Capital "${capitalToDelete.name}" Deleted`,
            capitalDeleted: true,
          };
        }
        return t;
      })
    );
  };

  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    // Keep the ledger record but tag it as removed
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.referenceId === id) {
          return { ...t, deletedTag: 'Expense Removed', expenseDeleted: true };
        }
        return t;
      })
    );
  };

  const deleteSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));

    // Keep the ledger record but tag it as removed
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.referenceId === id) {
          return { ...t, deletedTag: 'Fund Removed', fundDeleted: true };
        }
        return t;
      })
    );
  };

  const resetApp = () => {
    setCapitals([]);
    setFund([]);
    setSources([]);
    setExpenses([]);
    setTransactions([]);
    AsyncStorage.removeItem(STORAGE_KEY);
  };

  const loadDummyData = (dummyData) => {
    setCapitals(dummyData.capitals || []);
    setFund(dummyData.fund || []);
    setSources(dummyData.sources || []);
    setExpenses(dummyData.expenses || []);
    setTransactions(dummyData.transactions || []);
  };

  const toggleDarkMode = () => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const value = {
    capitals,
    fund,
    sources,
    expenses,
    transactions,
    settings,
    setSettings,
    addCapital,
    updateCapital,
    addSource,
    updateSource,
    addExpense,
    deleteCapital,
    deleteExpense,
    deleteSource,
    getCapitalBalance,
    getInitialBalance,
    getTotalBalance,
    resetApp,
    loadDummyData,
    toggleDarkMode,
  };

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
};
