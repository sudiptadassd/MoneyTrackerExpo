import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';
import { useTheme } from '../components/ThemeWrapper';
import TransactionCard from '../components/TransactionCard';
import CapitalFilterDropdown from '../components/CapitalFilterDropdown';
import SortDropdown from '../components/SortDropdown';
import ThemeToggle from '../components/ThemeToggle';

const filterTypes = ['ALL', 'CREDIT', 'DEBIT'];

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { transactions, capitals } = useExpenses();
  const [filterType, setFilterType] = useState('ALL');
  const [filterCapital, setFilterCapital] = useState('all');
  const [sortBy, setSortBy] = useState('NEWEST');

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCapital = filterCapital === 'all' || t.capitalId === filterCapital;
    return matchesType && matchesCapital;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'OLDEST': return new Date(a.date) - new Date(b.date);
      case 'AMOUNT_HIGH': return b.amount - a.amount;
      case 'AMOUNT_LOW': return a.amount - b.amount;
      default: return new Date(b.date) - new Date(a.date);
    }
  });

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.heading }]}>Ledger History</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Trail of all transactions</Text>
          </View>
          <ThemeToggle />
        </View>

        <View style={[styles.tabBar, { backgroundColor: colors.input }]}>
          {filterTypes.map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type)}
              style={[
                styles.tab,
                filterType === type && { backgroundColor: colors.card },
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: filterType === type ? colors.primary : colors.muted }
              ]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          <CapitalFilterDropdown capitals={capitals} selectedCapital={filterCapital} onSelect={setFilterCapital} />
          <SortDropdown currentSort={sortBy} onSortChange={setSortBy} />
        </View>

        <View style={{ paddingBottom: 100 }}>
          {filteredTransactions.map(transaction => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
          {filteredTransactions.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="book" size={60} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.muted }]}>Clear as a whistle</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>No transactions match your filters.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  tabBar: { flexDirection: 'row', padding: 4, borderRadius: 24, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 20, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  empty: { paddingVertical: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '500', marginTop: 12 },
  emptySub: { fontSize: 12, marginTop: 4, opacity: 0.7 },
});
