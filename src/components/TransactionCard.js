import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';
import { useTheme } from './ThemeWrapper';

const TransactionCard = ({ transaction, onEdit, onDelete, showActions = false }) => {
  const { capitals, settings } = useExpenses();
  const { colors } = useTheme();
  const isCredit = transaction.type === 'CREDIT';
  const capital = capitals.find(c => c.id === transaction.capitalId);
  const isDeleted = transaction.capitalDeleted || transaction.fundDeleted || transaction.expenseDeleted;

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear().toString().slice(-2);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes}${ampm}`;
  };

  const breakdownLines = transaction.breakdown
    ? transaction.breakdown.split(',').map(p => p.trim()).filter(p => p)
    : [];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <Text style={[styles.note, { color: colors.heading }]} numberOfLines={1}>
            {transaction.note || (isCredit ? 'Source' : 'Expense')}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {capital?.name || transaction.capitalName || 'Unknown Capital'} {'\u2022'} {transaction.type}
          </Text>
          {isDeleted && transaction.deletedTag && (
            <View style={styles.deletedTag}>
              <Text style={styles.deletedTagText}>{transaction.deletedTag}</Text>
            </View>
          )}
        </View>
        <View style={styles.rightInfo}>
          <View style={styles.amountRow}>
            {showActions && isCredit && (
              <View style={styles.actionGroup}>
                {onEdit && (
                  <TouchableOpacity onPress={() => onEdit(transaction)} style={styles.miniBtn}>
                    <Ionicons name="pencil" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity onPress={() => onDelete(transaction)} style={styles.miniBtn}>
                    <Ionicons name="trash-outline" size={14} color="#f43f5e" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={[styles.amount, { color: isCredit ? '#10b981' : '#f43f5e' }]}>
              {isCredit ? '+' : '-'}{settings.currency}{transaction.amount.toLocaleString()}
            </Text>
            <Ionicons
              name={isCredit ? 'arrow-down' : 'arrow-up'}
              size={20}
              color={isCredit ? '#10b981' : '#f43f5e'}
            />
          </View>
          <Text style={[styles.date, { color: colors.muted }]}>
            <Ionicons name="time-outline" size={10} color={colors.muted} /> {formatDate(transaction.date)}
          </Text>
        </View>
      </View>

      {breakdownLines.length > 0 && (
        <View style={[styles.breakdownBox, { backgroundColor: colors.input, borderLeftColor: colors.border }]}>
          {breakdownLines.map((line, index) => (
            <Text key={index} style={[styles.breakdownLine, { color: colors.muted }]}>{line}</Text>
          ))}
        </View>
      )}

      <View style={[styles.ledger, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.ledgerLabel, { color: colors.muted }]}>Balance Before</Text>
          <Text style={[styles.ledgerValue, { color: colors.muted }]}>
            {settings.currency}{transaction.balanceBefore.toLocaleString()}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.muted} />
        <View style={styles.ledgerRight}>
          <Text style={[styles.ledgerLabel, { color: colors.muted }]}>Balance After</Text>
          <Text style={[styles.ledgerValueAfter, { color: colors.primary }]}>
            {settings.currency}{transaction.balanceAfter.toLocaleString()}
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
    marginBottom: 8,
  },
  leftInfo: {
    flex: 1,
    marginRight: 12,
  },
  note: {
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  deletedTag: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deletedTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f43f5e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightInfo: {
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  miniBtn: {
    padding: 6,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    fontSize: 10,
    marginTop: 4,
  },
  breakdownBox: {
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 2,
    marginBottom: 8,
  },
  breakdownLine: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  ledger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ledgerLabel: {
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.7,
    marginBottom: 2,
  },
  ledgerValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerValueAfter: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default TransactionCard;
