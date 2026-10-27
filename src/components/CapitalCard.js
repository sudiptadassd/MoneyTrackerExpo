import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';
import { useTheme } from './ThemeWrapper';

const CapitalCard = ({ capital, variant = 'detailed', onPress, onEdit, onDelete }) => {
  const { getCapitalBalance, getInitialBalance, sources, settings } = useExpenses();
  const { colors } = useTheme();

  const balance = getCapitalBalance(capital.id);
  const initial = getInitialBalance(capital.id);
  const percentage = initial > 0 ? Math.max(0, Math.min(100, (balance / initial) * 100)) : 0;

  const capitalSources = sources.filter(s => s.capitalId === capital.id);

  const colorMap = {
    blue: { bg: '#3b82f6', text: '#3b82f6' },
    emerald: { bg: '#10b981', text: '#10b981' },
    rose: { bg: '#f43f5e', text: '#f43f5e' },
    amber: { bg: '#f59e0b', text: '#f59e0b' },
    indigo: { bg: '#6366f1', text: '#6366f1' },
    violet: { bg: '#8b5cf6', text: '#8b5cf6' },
    purple: { bg: '#a855f7', text: '#a855f7' },
    pink: { bg: '#ec4899', text: '#ec4899' },
    cyan: { bg: '#06b6d4', text: '#06b6d4' },
    teal: { bg: '#14b8a6', text: '#14b8a6' },
    lime: { bg: '#84cc16', text: '#84cc16' },
    orange: { bg: '#f97316', text: '#f97316' },
  };

  const colors2 = colorMap[capital.color] || colorMap.blue;

  const getFundsPreview = () => {
    if (capitalSources.length === 0) return { types: [], lastUpdate: null };
    const allFunds = [];
    capitalSources.forEach(source => {
      if (source.breakdown) {
        const parts = source.breakdown.split(', ');
        parts.forEach(part => {
          const match = part.match(/(.+?):\s*(.+?)\s*-\s*[^\d]*([\d.]+)/);
          if (match) {
            const [, type, , amt] = match;
            const typeKey = type.trim();
            const existing = allFunds.find(f => f.type === typeKey);
            if (existing) existing.total += Number(amt);
            else allFunds.push({ type: typeKey, total: Number(amt) });
          }
        });
      }
    });
    const lastUpdate = capitalSources.length > 0 ? new Date(capitalSources[0].date) : null;
    return { types: allFunds, lastUpdate };
  };

  const fundsPreview = getFundsPreview();

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.compactInner}>
          <View style={styles.compactLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors2.bg }]}>
              <Ionicons name="wallet" size={22} color="#fff" />
            </View>
            <View>
              <Text style={[styles.capitalName, { color: colors.heading }]}>{capital.name}</Text>
              <Text style={[styles.capitalSub, { color: colors.muted }]}>Available Capital</Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            <Text style={[styles.balanceText, { color: colors.heading }]}>
              <Text style={styles.currencySign}>{settings.currency}</Text>
              {balance.toLocaleString()}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.input }]}>
          <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: colors2.bg }]} />
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            INITIAL: {settings.currency}{initial.toLocaleString()}
          </Text>
          <Text style={[styles.footerText, { color: colors2.text }]}>{Math.round(percentage)}% LEFT</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.detailedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.detailedHeader}>
        <View style={styles.detailedLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors2.bg }]}>
            <Ionicons name="wallet" size={27} color="#fff" />
          </View>
          <Text style={[styles.detailedTitle, { color: colors.heading }]}>{capital.name}</Text>
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Ionicons name="pencil" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={18} color="#f43f5e" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.balanceRow}>
        <Text style={[styles.balanceLabel, { color: colors.muted }]}>Balance</Text>
        <Text style={[styles.balanceValue, { color: colors.heading }]}>
          <Text style={styles.currencySign}>{settings.currency}</Text>
          {balance.toLocaleString()}
        </Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.input }]}>
        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: colors2.bg }]} />
      </View>

      {fundsPreview.types.length > 0 && (
        <View style={[styles.fundPreview, { backgroundColor: colors.input }]}>
          <View style={styles.fundPreviewHeader}>
            <Text style={[styles.fundPreviewTitle, { color: colors.muted }]}>FUND DETAILS</Text>
            {fundsPreview.lastUpdate && (
              <Text style={[styles.fundPreviewDate, { color: colors.muted }]}>
                {fundsPreview.lastUpdate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {fundsPreview.lastUpdate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
          {fundsPreview.types.map((fund, idx) => (
            <View key={idx} style={styles.fundRow}>
              <Text style={[styles.fundType, { color: colors.muted }]}>{fund.type}</Text>
              <Text style={[styles.fundAmount, { color: colors.heading }]}>{settings.currency}{fund.total.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.muted }]}>
          INITIAL: {settings.currency}{initial.toLocaleString()}
        </Text>
        <Text style={[styles.footerText, { color: colors2.text }]}>{Math.round(percentage)}% LEFT</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  compactInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capitalName: {
    fontSize: 16,
    fontWeight: '700',
  },
  capitalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '700',
  },
  currencySign: {
    fontSize: 12,
    opacity: 0.6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailedCard: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailedTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  balanceLabel: {
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  fundPreview: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  fundPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fundPreviewTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fundPreviewDate: {
    fontSize: 10,
  },
  fundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  fundType: {
    fontSize: 12,
    fontWeight: '500',
  },
  fundAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default CapitalCard;
