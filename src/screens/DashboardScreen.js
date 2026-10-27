import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../components/ThemeWrapper';
import CapitalCard from '../components/CapitalCard';
import TransactionCard from '../components/TransactionCard';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    capitals,
    settings,
    getCapitalBalance,
    addExpense,
    expenses,
    transactions,
  } = useExpenses();
  const { toast } = useFeedback();

  // Add Expense Modal State
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isCapitalPickerOpen, setIsCapitalPickerOpen] = useState(false);
  const [selectedCapitalId, setSelectedCapitalId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseReason, setExpenseReason] = useState('');
  const [expenseBreakdown, setExpenseBreakdown] = useState('');
  const [formError, setFormError] = useState('');

  // Local date (matches the web app's en-CA "YYYY-MM-DD" output)
  const today = new Date().toLocaleDateString('en-CA');

  const todayExpenses = expenses
    .filter((e) => e.date.startsWith(today))
    .reduce((sum, e) => sum + e.amount, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyExpenses = expenses
    .filter((e) => new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const key = date.toLocaleDateString('en-CA');
    const total = expenses
      .filter((expense) => expense.date.startsWith(key))
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    return {
      key,
      total,
      isToday: index === 6,
      label: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
    };
  });

  const maxDailySpend = Math.max(...last7Days.map((day) => day.total), 1);
  const chartDays = last7Days.map((day) => ({
    ...day,
    barHeight:
      day.total > 0
        ? Math.max(8, Math.round((day.total / maxDailySpend) * 52))
        : 5,
  }));

  const todayShare =
    monthlyExpenses > 0
      ? Math.min(100, Math.round((todayExpenses / monthlyExpenses) * 100))
      : 0;

  const monthLabel = new Date().toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const recentTransactions = transactions.slice(0, 9);

  const selectedCapital = capitals.find((c) => c.id === selectedCapitalId);
  const selectedCapitalBalance = selectedCapitalId
    ? getCapitalBalance(selectedCapitalId)
    : 0;

  const calculatedAmount = Number(expenseAmount) || 0;
  const afterBalance = selectedCapitalBalance - calculatedAmount;

  const closeAddExpenseModal = () => {
    setIsAddExpenseModalOpen(false);
    setIsCapitalPickerOpen(false);
    setFormError('');
  };

  const handleAddExpense = () => {
    setFormError('');

    if (!selectedCapitalId) {
      setFormError('Please select a capital');
      toast('Please select a capital', 'error');
      return;
    }

    if (!expenseReason.trim()) {
      setFormError('Please enter reason for expense');
      toast('Please enter reason for expense', 'error');
      return;
    }

    if (!expenseAmount || calculatedAmount <= 0) {
      setFormError('Please enter a valid amount');
      toast('Please enter a valid amount', 'error');
      return;
    }

    try {
      // Combine reason and breakdown
      const fullBreakdown = expenseBreakdown.trim()
        ? `${expenseReason.trim()}, ${expenseBreakdown.trim()}`
        : expenseReason.trim();

      addExpense(
        selectedCapitalId,
        expenseReason.trim(), // reason is used as the title
        fullBreakdown,
        calculatedAmount,
        null
      );

      // Reset form
      setSelectedCapitalId('');
      setExpenseAmount('');
      setExpenseReason('');
      setExpenseBreakdown('');
      setIsCapitalPickerOpen(false);
      setFormError('');
      setIsAddExpenseModalOpen(false);

      toast('Expense added successfully!', 'success');
    } catch (error) {
      setFormError(error.message);
      toast(error.message, 'error');
    }
  };

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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.appName, { color: colors.heading }]}>MTrack</Text>
          </View>
          <ThemeToggle />
        </View>

        {/* Spending Overview Card */}
        <View style={[styles.spendingCard, { backgroundColor: colors.primary }]}>
          <View style={styles.spendingOrbLarge} />
          <View style={styles.spendingOrbSmall} />

          <View style={styles.spendingHeader}>
            <View>
              <Text style={styles.spendingEyebrow}>SPENDING OVERVIEW</Text>
              <Text style={styles.spendingTitle}>Last 7 days</Text>
            </View>
            <View style={styles.spendingBadge}>
              <Ionicons name="calendar-clear-outline" size={13} color="#fff" />
              <Text style={styles.spendingBadgeText}>{monthLabel}</Text>
            </View>
          </View>

          <View style={styles.spendingStats}>
            <View style={styles.spendingStatTile}>
              <View style={styles.spendingStatTop}>
                <View
                  style={[
                    styles.spendingStatIcon,
                    { backgroundColor: 'rgba(251,191,36,0.18)' },
                  ]}
                >
                  <Ionicons name="trending-down" size={15} color="#fbbf24" />
                </View>
                <Text style={styles.spendingStatLabel}>Today's Spent</Text>
              </View>
              <Text
                style={styles.spendingStatValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                <Text style={styles.spendingStatCurrency}>
                  {settings.currency}
                </Text>
                {todayExpenses.toLocaleString()}
              </Text>
            </View>

            <View style={styles.spendingStatTile}>
              <View style={styles.spendingStatTop}>
                <View
                  style={[
                    styles.spendingStatIcon,
                    { backgroundColor: 'rgba(191,219,254,0.18)' },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={15} color="#bfdbfe" />
                </View>
                <Text style={styles.spendingStatLabel}>This Month</Text>
              </View>
              <Text
                style={styles.spendingStatValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                <Text style={styles.spendingStatCurrency}>
                  {settings.currency}
                </Text>
                {monthlyExpenses.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.spendingChart}>
            <View style={styles.spendingChartHeader}>
              <Text style={styles.spendingChartLabel}>DAILY SPEND</Text>
              <View style={styles.spendingLegend}>
                <View style={styles.spendingLegendDot} />
                <Text style={styles.spendingLegendText}>Today</Text>
              </View>
            </View>

            <View style={styles.spendingBars}>
              {chartDays.map((day) => (
                <View key={day.key} style={styles.spendingBarColumn}>
                  <View style={styles.spendingBarTrack}>
                    <View
                      style={[
                        styles.spendingBar,
                        {
                          height: day.barHeight,
                          backgroundColor: day.isToday
                            ? '#fbbf24'
                            : 'rgba(255,255,255,0.42)',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.spendingBarLabel,
                      day.isToday && styles.spendingBarLabelToday,
                    ]}
                  >
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.spendingProgressRow}>
            <Text style={styles.spendingProgressText}>
              Today's share of this month
            </Text>
            <Text style={styles.spendingProgressValue}>{todayShare}%</Text>
          </View>
          <View style={styles.spendingProgressTrack}>
            <View
              style={[styles.spendingProgressFill, { width: `${todayShare}%` }]}
            />
          </View>
        </View>

        {/* My Capitals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.heading }]}>My Capitals</Text>
          </View>

          {capitals.length > 0 ? (
            capitals.map((capital) => (
              <CapitalCard
                key={capital.id}
                capital={capital}
                variant="compact"
                onPress={() =>
                  navigation.navigate('Capitals', {
                    screen: 'CapitalDetails',
                    params: { id: capital.id },
                  })
                }
              />
            ))
          ) : (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.background }]}>
                <Ionicons name="wallet" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.heading }]}>
                No capitals found
              </Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Start your financial journey by adding your first source of funds.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Capitals')}
                style={[
                  styles.emptyBtn,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Ionicons name="add-circle" size={16} color={colors.muted} />
                <Text style={[styles.emptyBtnText, { color: colors.muted }]}>
                  Create Capital
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.heading }]}>
              Recent Ledger
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
          {recentTransactions.length === 0 && (
            <Text style={[styles.noData, { color: colors.muted }]}>
              No transactions found
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Expense Button */}
      {capitals.length > 0 && (
        <TouchableOpacity
          onPress={() => setIsAddExpenseModalOpen(true)}
          style={styles.fab}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseModalOpen}
        onClose={closeAddExpenseModal}
        title="Add New Expense"
      >
        {/* Capital Selection */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>
            From Which Capital <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setIsCapitalPickerOpen((open) => !open)}
            style={[styles.select, { backgroundColor: colors.input }]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.selectText,
                { color: selectedCapitalId ? colors.foreground : colors.placeholder },
              ]}
            >
              {selectedCapital ? selectedCapital.name : 'Select a capital'}
            </Text>
            <Ionicons
              name={isCapitalPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </TouchableOpacity>

          {isCapitalPickerOpen && (
            <View
              style={[
                styles.capitalOptions,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              {capitals.map((capital) => {
                const isSelected = selectedCapitalId === capital.id;
                return (
                  <TouchableOpacity
                    key={capital.id}
                    onPress={() => {
                      setSelectedCapitalId(capital.id);
                      setIsCapitalPickerOpen(false);
                      setFormError('');
                    }}
                    style={[
                      styles.capitalOption,
                      isSelected && {
                        backgroundColor: colors.card,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.capitalOptionText,
                        { color: isSelected ? colors.primary : colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {capital.name}
                    </Text>
                    <Text style={[styles.capitalOptionBalance, { color: colors.muted }]}>
                      {settings.currency}
                      {getCapitalBalance(capital.id).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Amount */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>
            Amount <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.amountInput}>
            <Text style={[styles.currencyPrefix, { color: colors.muted }]}>
              {settings.currency}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, backgroundColor: colors.input },
              ]}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Balance Display - auto calculated */}
        {selectedCapitalId && (
          <View style={[styles.balancePreview, { backgroundColor: colors.input }]}>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceRowLabel, { color: colors.muted }]}>
                Current Balance:
              </Text>
              <Text style={[styles.balanceRowValue, { color: colors.foreground }]}>
                {settings.currency}
                {selectedCapitalBalance.toLocaleString()}
              </Text>
            </View>

            {calculatedAmount > 0 && (
              <>
                <View style={styles.balanceRow}>
                  <Text style={[styles.balanceRowLabel, { color: colors.muted }]}>
                    Expense Amount:
                  </Text>
                  <Text style={[styles.balanceRowValue, { color: '#f43f5e' }]}>
                    -{settings.currency}
                    {calculatedAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.balanceRow}>
                  <Text style={[styles.balanceRowLabelBold, { color: colors.muted }]}>
                    After Expense:
                  </Text>
                  <Text
                    style={[
                      styles.balanceRowValueBold,
                      { color: afterBalance < 0 ? '#f43f5e' : '#10b981' },
                    ]}
                  >
                    {settings.currency}
                    {afterBalance.toLocaleString()}
                  </Text>
                </View>
                {afterBalance < 0 && (
                  <Text style={styles.insufficient}>Insufficient balance!</Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Reason */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>
            Reason for Expense <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.foreground, backgroundColor: colors.input },
            ]}
            placeholder="e.g., Weekly shopping, Fuel, Electricity bill"
            placeholderTextColor={colors.placeholder}
            value={expenseReason}
            onChangeText={setExpenseReason}
          />
        </View>

        {/* Additional Details */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>Additional Details</Text>
          <TextInput
            style={[
              styles.textArea,
              { color: colors.foreground, backgroundColor: colors.input },
            ]}
            placeholder="Additional details or itemized breakdown..."
            placeholderTextColor={colors.placeholder}
            value={expenseBreakdown}
            onChangeText={setExpenseBreakdown}
            multiline
            numberOfLines={3}
          />
        </View>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <TouchableOpacity
          onPress={handleAddExpense}
          style={styles.submitBtn}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>Add Expense</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: { fontSize: 36, fontWeight: '700' },
  welcome: { fontSize: 16, marginTop: 2 },
  spendingCard: {
    borderRadius: 28,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 24,
  },
  spendingOrbLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -80,
    right: -60,
  },
  spendingOrbSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -50,
    left: -35,
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  spendingEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.62)',
  },
  spendingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  spendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  spendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  spendingStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  spendingStatTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  spendingStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  spendingStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spendingStatLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  spendingStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  spendingStatCurrency: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.65,
  },
  spendingChart: {
    marginBottom: 14,
  },
  spendingChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spendingChartLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: 'rgba(255,255,255,0.55)',
  },
  spendingLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  spendingLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
  },
  spendingLegendText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  spendingBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 76,
  },
  spendingBarColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  spendingBarTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  spendingBar: {
    width: '100%',
    borderRadius: 6,
  },
  spendingBarLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  spendingBarLabelToday: {
    color: '#fff',
  },
  spendingProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendingProgressText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  spendingProgressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  spendingProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: 8,
    overflow: 'hidden',
  },
  spendingProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#fbbf24',
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  viewAll: { fontSize: 14, fontWeight: '600' },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 240,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyBtnText: { fontSize: 12, fontWeight: '700' },
  noData: { textAlign: 'center', paddingVertical: 16, fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  required: { color: '#f43f5e' },
  select: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { fontSize: 16, flex: 1 },
  capitalOptions: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
  },
  capitalOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  capitalOptionText: { fontSize: 14, fontWeight: '600', flex: 1 },
  capitalOptionBalance: { fontSize: 12 },
  amountInput: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  input: { flex: 1, padding: 16, paddingLeft: 40, borderRadius: 16, fontSize: 16 },
  textArea: {
    padding: 16,
    borderRadius: 16,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  balancePreview: { padding: 16, borderRadius: 16, marginBottom: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  balanceRowLabel: { fontSize: 14 },
  balanceRowValue: { fontSize: 14, fontWeight: '700' },
  balanceRowLabelBold: { fontSize: 14, fontWeight: '600' },
  balanceRowValueBold: { fontSize: 16, fontWeight: '700' },
  divider: { height: 1, marginVertical: 8 },
  insufficient: { color: '#f43f5e', fontSize: 12, fontWeight: '700', marginTop: 4 },
  formError: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  submitBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#e11d48',
    marginTop: 4,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
