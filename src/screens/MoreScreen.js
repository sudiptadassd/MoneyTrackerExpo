import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';
import { useExpenses } from '../context/ExpenseContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../components/ThemeWrapper';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';
import { generateDummyData } from '../utils/dummyData';

const CURRENCIES = [
  { label: 'USD ($)', value: '$' },
  { label: 'INR (\u20B9)', value: '\u20B9' },
  { label: 'EUR (\u20AC)', value: '\u20AC' },
  { label: 'GBP (\u00A3)', value: '\u00A3' },
  { label: 'BDT (\u09F3)', value: '\u09F3' },
];

const CAPITAL_COLORS = {
  blue: '#3b82f6',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  lime: '#84cc16',
  orange: '#f97316',
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (currency, value) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function MoreScreen() {
  const { colors } = useTheme();
  const {
    settings,
    setSettings,
    resetApp,
    capitals,
    fund,
    sources,
    expenses,
    transactions,
    loadDummyData,
    getTotalBalance,
    getCapitalBalance,
    getInitialBalance,
  } = useExpenses();
  const { toast, confirm } = useFeedback();

  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  const totalNetValue = getTotalBalance();

  /* ----------------------------- JSON export ----------------------------- */
  const handleExportJson = async () => {
    const ok = await confirm(
      'Download Backup?',
      'Save a JSON file containing all your capitals, expenses, and transactions?'
    );
    if (!ok) return;

    const data = {
      capitals,
      fund,
      sources,
      expenses,
      transactions,
      settings,
      exportDate: new Date().toISOString(),
    };

    try {
      const jsonString = JSON.stringify(data, null, 2);
      const fileName = `expense_tracker_export_${new Date()
        .toISOString()
        .split('T')[0]}.json`;
      const file = new File(Paths.cache, fileName);
      file.create({ overwrite: true, intermediates: true });
      file.write(jsonString);

      if (!(await Sharing.isAvailableAsync())) {
        toast('Sharing is not available on this device', 'error');
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'ExTrack Backup',
      });
      toast('JSON exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to export JSON', 'error');
    }
  };

  /* ------------------------------ PDF export ----------------------------- */
  const handleExportPdf = async () => {
    const ok = await confirm(
      'Download Report?',
      'Generate a PDF report of your financial status?'
    );
    if (!ok) return;

    const capitalsRows = capitals
      .map(
        (capital) => `
      <tr>
        <td>${escapeHtml(capital.name)}</td>
        <td>${escapeHtml(
          capital.color.charAt(0).toUpperCase() + capital.color.slice(1)
        )}</td>
        <td>${money(settings.currency, getCapitalBalance(capital.id))}</td>
        <td>${money(settings.currency, getInitialBalance(capital.id))}</td>
        <td>${
          capital.createdAt
            ? escapeHtml(new Date(capital.createdAt).toLocaleDateString())
            : 'N/A'
        }</td>
      </tr>
    `
      )
      .join('');

    const sourcesRows = sources
      .map(
        (source) => `
      <tr>
        <td>${escapeHtml(source.title)}</td>
        <td>${money(settings.currency, source.amount)}</td>
        <td>${escapeHtml(source.breakdown || 'No breakdown')}</td>
        <td>${escapeHtml(new Date(source.date).toLocaleDateString())}</td>
      </tr>
    `
      )
      .join('');

    const fundRows = fund
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.name || 'N/A')}</td>
        <td>${escapeHtml(item.description || 'No description')}</td>
        <td>${escapeHtml(item.status || 'Active')}</td>
      </tr>
    `
      )
      .join('');

    const expensesRows = expenses
      .map(
        (expense) => `
      <tr>
        <td>${escapeHtml(expense.title)}</td>
        <td>${money(settings.currency, expense.amount)}</td>
        <td>${escapeHtml(expense.reason || 'No reason provided')}</td>
        <td>${escapeHtml(expense.breakdown || 'No breakdown')}</td>
        <td>${escapeHtml(new Date(expense.date).toLocaleDateString())}</td>
        <td>${money(settings.currency, expense.beforeBalance)}</td>
        <td>${money(settings.currency, expense.afterBalance)}</td>
      </tr>
    `
      )
      .join('');

    const transactionsRows = transactions
      .map(
        (transaction) => `
      <tr>
        <td>${escapeHtml(transaction.type)}</td>
        <td>${money(settings.currency, transaction.amount)}</td>
        <td>${escapeHtml(transaction.note || 'No note')}</td>
        <td>${escapeHtml(transaction.breakdown || 'No breakdown')}</td>
        <td>${money(settings.currency, transaction.balanceBefore)}</td>
        <td>${money(settings.currency, transaction.balanceAfter)}</td>
        <td>${escapeHtml(new Date(transaction.date).toLocaleDateString())}</td>
        <td>${escapeHtml(
          transaction.capitalName ||
            capitals.find((c) => c.id === transaction.capitalId)?.name ||
            'Unknown Capital'
        )}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: sans-serif; padding: 20px; color: #374151; }
            h1 { color: #1e3a8a; font-size: 22px; }
            h2 { color: #1e3a8a; margin-top: 24px; font-size: 15px; }
            p.meta { color: #6b7280; font-size: 11px; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0 20px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
            th { background: #1e3a8a; color: white; padding: 8px; text-align: left; }
            td { padding: 6px; border: 1px solid #e5e7eb; vertical-align: top; }
            tr:nth-child(even) { background: #f9fafb; }
            .summary { font-size: 14px; margin: 16px 0; }
            .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>Expense Tracker Report</h1>
          <p class="meta">Exported on: ${escapeHtml(new Date().toLocaleString())}</p>
          <hr />

          <h2>Financial Summary</h2>
          <p class="summary">Total Balance: ${money(settings.currency, totalNetValue)}</p>

          ${
            capitals.length > 0
              ? `<h2>Capitals (Detailed)</h2>
                 <table>
                   <tr><th>Name</th><th>Color</th><th>Current Balance</th><th>Initial Balance</th><th>Created Date</th></tr>
                   ${capitalsRows}
                 </table>`
              : ''
          }

          ${
            sources.length > 0
              ? `<h2>Sources (Detailed)</h2>
                 <table>
                   <tr><th>Title</th><th>Amount</th><th>Breakdown</th><th>Date</th></tr>
                   ${sourcesRows}
                 </table>`
              : ''
          }

          ${
            fund.length > 0
              ? `<h2>Fund Records</h2>
                 <table>
                   <tr><th>Name</th><th>Description</th><th>Status</th></tr>
                   ${fundRows}
                 </table>`
              : ''
          }

          ${
            expenses.length > 0
              ? `<h2>Expenses (Detailed)</h2>
                 <table>
                   <tr><th>Title</th><th>Amount</th><th>Reason</th><th>Breakdown</th><th>Date</th><th>Before</th><th>After</th></tr>
                   ${expensesRows}
                 </table>`
              : ''
          }

          ${
            transactions.length > 0
              ? `<h2>Transactions (Comprehensive)</h2>
                 <table>
                   <tr><th>Type</th><th>Amount</th><th>Note</th><th>Breakdown</th><th>Balance Before</th><th>Balance After</th><th>Date</th><th>Capital</th></tr>
                   ${transactionsRows}
                 </table>`
              : ''
          }

          <h2>Settings</h2>
          <table>
            <tr><th>Key</th><th>Value</th></tr>
            <tr><td>Currency</td><td>${escapeHtml(settings.currency)}</td></tr>
            <tr><td>Dark Mode</td><td>${settings.darkMode ? 'Enabled' : 'Disabled'}</td></tr>
          </table>

          <p class="footer">Generated by ExTrack</p>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });

      if (!(await Sharing.isAvailableAsync())) {
        toast('Sharing is not available on this device', 'error');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'ExTrack Report',
      });
      toast('PDF exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to export PDF', 'error');
    }
  };

  /* ------------------------------ Sample data ---------------------------- */
  const handleInitDummyData = async () => {
    const ok = await confirm(
      'Load Sample Data?',
      'This will add dummy data to your notebook. Useful for testing.'
    );
    if (!ok) return;

    const dummyData = generateDummyData();
    loadDummyData(dummyData);
    toast('Sample notebook data loaded!', 'info');
  };

  const handleResetApp = async () => {
    const ok = await confirm(
      'Reset Everything?',
      'This will wipe all your data permanently. This cannot be undone.'
    );
    if (ok) {
      resetApp();
      toast('Application reset successful', 'success');
    }
  };

  /* -------------------------------- Import ------------------------------- */
  const handleImportClick = async () => {
    const ok = await confirm(
      'Import Data?',
      'This will merge/overwrite your current data with the uploaded file. This cannot be undone. Always backup first.'
    );
    if (!ok) return;

    try {
      // Accept any file: Android file providers often report JSON as
      // "application/octet-stream", so the JSON validation below is the
      // real gate (same as the web app's file input).
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const content = await new File(asset.uri).text();
        const data = JSON.parse(content);

        // Basic validation (same as the web app)
        if (!data.capitals || !data.expenses || !data.settings) {
          toast('Invalid file format', 'error');
          return;
        }

        loadDummyData(data); // reuse the existing loader
        toast('Data imported successfully!', 'success');
      }
    } catch (err) {
      console.error(err);
      toast('Invalid JSON file', 'error');
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
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.heading }]}>More Option</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Profile and Settings
            </Text>
          </View>
          <ThemeToggle />
        </View>

        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: colors.input }]}>
              <Ionicons name="person" size={48} color={colors.primary} />
            </View>
            <View style={[styles.badge, { borderColor: colors.card }]}>
              <Ionicons name="shield-checkmark" size={16} color="#10b981" />
            </View>
          </View>
          <Text style={[styles.profileName, { color: colors.heading }]}>User</Text>
          <View style={styles.profileMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={14} color={colors.muted} />
              <Text style={[styles.metaText, { color: colors.muted }]}>
                user@example.com
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.muted} />
              <Text style={[styles.metaText, { color: colors.muted }]}>
                Joined January 2024
              </Text>
            </View>
          </View>
        </View>

        {/* Asset Portfolio */}
        <View
          style={[
            styles.portfolioCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.portfolioHeader}>
            <Text style={[styles.portfolioTitle, { color: colors.heading }]}>
              Asset Portfolio
            </Text>
            <View style={[styles.portfolioBadge, { backgroundColor: colors.input }]}>
              <Text style={[styles.portfolioBadgeText, { color: colors.muted }]}>
                LIVE BALANCES
              </Text>
            </View>
          </View>

          {capitals.map((capital) => {
            const balance = getCapitalBalance(capital.id);
            const dotColor = CAPITAL_COLORS[capital.color] || CAPITAL_COLORS.blue;
            return (
              <View key={capital.id} style={styles.portfolioRow}>
                <View style={styles.portfolioLeft}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={[styles.assetName, { color: colors.foreground }]}>
                    {capital.name}
                  </Text>
                </View>
                <Text style={[styles.assetBalance, { color: colors.foreground }]}>
                  <Text style={styles.currencySmall}>{settings.currency}</Text>
                  {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}

          {capitals.length === 0 && (
            <Text style={[styles.noAssets, { color: colors.muted }]}>
              No capitals yet.
            </Text>
          )}

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.muted }]}>
              Total Net Value
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              <Text style={styles.currencySmall}>{settings.currency}</Text>
              {totalNetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Preference */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>PREFERENCE</Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons
                    name={settings.darkMode ? 'moon' : 'sunny'}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Dark Mode
                </Text>
              </View>
              <ThemeToggle />
            </View>

            <TouchableOpacity
              onPress={() => setIsCurrencyModalOpen(true)}
              style={styles.settingRow}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons name="cash" size={18} color="#f59e0b" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Default Currency
                </Text>
              </View>
              <View style={styles.currencyValue}>
                <Text style={[styles.currencyValueText, { color: colors.primary }]}>
                  {settings.currency}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.muted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Storage & Backup */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>
            STORAGE & BACKUP
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={handleExportPdf}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons name="document-text" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Download Data (PDF)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportJson}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons name="code" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Download Data (JSON)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleInitDummyData}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons name="refresh" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Load Sample Data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleImportClick}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons name="cloud-upload" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Import Data (JSON)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResetApp} style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons name="trash-outline" size={18} color="#f43f5e" />
                </View>
                <Text style={[styles.settingLabel, { color: '#f43f5e' }]}>
                  Reset All Data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ABOUT APP</Text>
          <View
            style={[
              styles.aboutCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.aboutRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                <Ionicons name="information-circle" size={18} color={colors.muted} />
              </View>
              <View>
                <Text style={[styles.aboutVersion, { color: colors.foreground }]}>
                  V1.0.0 Notebook Edition
                </Text>
                <Text style={[styles.aboutBuild, { color: colors.muted }]}>
                  Stable Build 2026.01.15
                </Text>
              </View>
            </View>
            <Text style={[styles.aboutDesc, { color: colors.muted }]}>
              Built with notebook-style logic. Auto-calculates before/after balances
              and maintains a complete transaction ledger for multiple capitals.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with love for efficiency</Text>
        </View>
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        title="Default Currency"
      >
        {CURRENCIES.map((currency) => {
          const isSelected = settings.currency === currency.value;
          return (
            <TouchableOpacity
              key={currency.value}
              onPress={() => {
                setSettings((prev) => ({ ...prev, currency: currency.value }));
                setIsCurrencyModalOpen(false);
                toast('Currency updated', 'success');
              }}
              style={[
                styles.currencyOption,
                { borderBottomColor: colors.border },
                isSelected && { backgroundColor: colors.input },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.currencyOptionText,
                  { color: isSelected ? colors.primary : colors.foreground },
                ]}
              >
                {currency.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 2 },
  profileCard: {
    borderRadius: 25,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarSection: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  profileMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14 },
  portfolioCard: {
    borderRadius: 25,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  portfolioHeader: {
    padding: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioTitle: { fontSize: 18, fontWeight: '700' },
  portfolioBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  portfolioBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  portfolioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  portfolioLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  assetName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  assetBalance: { fontSize: 14, fontWeight: '700' },
  currencySmall: { fontSize: 11, opacity: 0.5 },
  noAssets: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 14, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '900' },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
  },
  settingsCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  currencyValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyValueText: { fontSize: 16, fontWeight: '700' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aboutCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  aboutVersion: { fontSize: 14, fontWeight: '600' },
  aboutBuild: { fontSize: 10, marginTop: 2 },
  aboutDesc: { fontSize: 12, lineHeight: 18 },
  footer: { paddingVertical: 16, alignItems: 'center' },
  footerText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderBottomWidth: 1,
  },
  currencyOptionText: { fontSize: 15, fontWeight: '600' },
});
