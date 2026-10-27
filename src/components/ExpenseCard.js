import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';
import { useTheme } from './ThemeWrapper';

const ExpenseCard = ({ expense }) => {
  const { capitals, settings } = useExpenses();
  const { colors } = useTheme();
  const capital = capitals.find(c => c.id === expense.capitalId);

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.title, { color: colors.heading }]}>{expense.title}</Text>
          <View style={styles.tags}>
            <Text style={[styles.tag, { backgroundColor: colors.input, color: colors.muted }]}>
              {capital?.name || 'Deleted'}
            </Text>
            <Text style={[styles.dateText, { color: colors.muted }]}>
              <Ionicons name="time-outline" size={10} color={colors.muted} /> {formatDate(expense.date)}
            </Text>
          </View>
        </View>
        <Text style={styles.amount}>
          -{settings.currency}{expense.amount.toLocaleString()}
        </Text>
      </View>

      {expense.reason && (
        <View style={[styles.reasonBox, { backgroundColor: colors.input, borderLeftColor: colors.border }]}>
          <Text style={[styles.reasonText, { color: colors.muted }]}>"{expense.reason}"</Text>
        </View>
      )}

      <View style={[styles.ledgerRow, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.ledgerLabel, { color: colors.muted }]}>Before</Text>
          <Text style={[styles.ledgerValue, { color: colors.muted }]}>
            {settings.currency}{expense.beforeBalance.toLocaleString()}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={12} color={colors.border} />
        <View style={styles.ledgerRight}>
          <Text style={[styles.ledgerLabel, { color: colors.muted }]}>After</Text>
          <Text style={[styles.ledgerValueAfter, { color: colors.primary }]}>
            {settings.currency}{expense.afterBalance.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 10,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f43f5e',
  },
  reasonBox: {
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 2,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  ledgerLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  ledgerValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerValueAfter: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ExpenseCard;
