import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';
import { useTheme } from '../components/ThemeWrapper';
import ExpenseCard from '../components/ExpenseCard';
import CapitalFilterDropdown from '../components/CapitalFilterDropdown';
import SortDropdown from '../components/SortDropdown';
import ThemeToggle from '../components/ThemeToggle';

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const { expenses, capitals, settings } = useExpenses();
  const [filterCapital, setFilterCapital] = useState('all');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExpenses = expenses.filter(e => {
    const matchesCapital = filterCapital === 'all' || e.capitalId === filterCapital;
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCapital && matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'OLDEST': return new Date(a.date) - new Date(b.date);
      case 'AMOUNT_HIGH': return b.amount - a.amount;
      case 'AMOUNT_LOW': return a.amount - b.amount;
      default: return new Date(b.date) - new Date(a.date);
    }
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.heading }]}>Expenses</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>All debits across all capitals</Text>
          </View>
          <ThemeToggle />
        </View>

        <View style={[styles.summaryCard, { backgroundColor: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.2)' }]}>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>TOTAL FILTERED</Text>
            <Text style={[styles.summaryAmount, { color: colors.heading }]}>
              {settings.currency}{totalFiltered.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
            <Ionicons name="trending-down" size={24} color="#f43f5e" />
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="Search expenses..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          <CapitalFilterDropdown capitals={capitals} selectedCapital={filterCapital} onSelect={setFilterCapital} />
          <SortDropdown currentSort={sortBy} onSortChange={setSortBy} />
        </View>

        <View style={{ paddingBottom: 100 }}>
          {filteredExpenses.map(expense => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
          {filteredExpenses.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="trending-down" size={48} color={colors.muted} style={{ opacity: 0.1 }} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No expenses found.</Text>
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
  summaryCard: { padding: 20, borderRadius: 24, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  summaryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  summaryAmount: { fontSize: 24, fontWeight: '700' },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  searchBox: { position: 'relative', marginBottom: 12 },
  searchIcon: { position: 'absolute', left: 16, top: 18, zIndex: 1 },
  searchInput: { padding: 16, paddingLeft: 44, borderRadius: 16, borderWidth: 1, fontSize: 16 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  empty: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
});
