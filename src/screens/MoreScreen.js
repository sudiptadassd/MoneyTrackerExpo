import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';
import { useExpenses } from '../context/ExpenseContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../components/ThemeWrapper';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';
import { generateDummyData } from '../utils/dummyData';
import { parseBackup } from '../utils/backupImport';

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

/* The folder chosen through the Android Storage Access Framework is remembered
   here, so later downloads can write straight into it without asking again. */
const DOWNLOAD_FOLDER_KEY = 'mtrack.downloadFolderUri';

/* Opens the folder picker directly inside the device's Download folder. */
const ANDROID_DOWNLOADS_INITIAL_URI =
  'content://com.android.externalstorage.documents/document/primary%3ADownload';

/* Legacy path. Modern Android blocks this, but trying it first keeps direct
   saving working on devices where the app still has legacy storage access. */
const ANDROID_PUBLIC_DOWNLOADS_URI = 'file:///storage/emulated/0/Download/';

const isPickerCancel = (error) =>
  /cancel/i.test(String(error?.message || '')) ||
  error?.code === 'ERR_PICKER_CANCELLED';

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

/* Keep imports bounded so a huge file cannot freeze the UI thread. */
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatExportDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};

const countLabel = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const describeImport = (result) => {
  if (!result) return '';

  if (result.mode === 'replace') {
    if (result.isCapitalExport) {
      return `Replaced "${result.scopeLabel}" with ${countLabel(
        result.sourcesAdded,
        'fund entry',
        'fund entries'
      )}, ${countLabel(result.expensesAdded, 'expense')} and ${countLabel(
        result.transactionsAdded,
        'transaction'
      )}.`;
    }

    return `Restored ${countLabel(
      result.capitalsAdded,
      'capital'
    )}, ${countLabel(
      result.sourcesAdded,
      'fund entry',
      'fund entries'
    )}, ${countLabel(result.expensesAdded, 'expense')} and ${countLabel(
      result.transactionsAdded,
      'transaction'
    )}.`;
  }

  const added = [];

  if (result.capitalsAdded) {
    added.push(countLabel(result.capitalsAdded, 'new capital'));
  }
  if (result.sourcesAdded) {
    added.push(countLabel(result.sourcesAdded, 'fund entry', 'fund entries'));
  }
  if (result.expensesAdded) {
    added.push(countLabel(result.expensesAdded, 'expense'));
  }
  if (result.transactionsAdded) {
    added.push(countLabel(result.transactionsAdded, 'transaction'));
  }
  if (result.fundAdded) {
    added.push(countLabel(result.fundAdded, 'fund record'));
  }

  const skipped =
    result.fundSkipped +
    result.sourcesSkipped +
    result.expensesSkipped +
    result.transactionsSkipped;

  if (added.length === 0) {
    return skipped
      ? 'Nothing new to import — every record already exists.'
      : 'The backup did not contain any records to import.';
  }

  const addedText = `Imported ${added.join(', ')}.`;
  return skipped
    ? `${addedText} Skipped ${countLabel(skipped, 'existing record')}.`
    : addedText;
};

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
    importData,
    getTotalBalance,
    getCapitalBalance,
    getInitialBalance,
  } = useExpenses();
  const { toast, confirm } = useFeedback();

  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  /* Download modal state */
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [downloadScope, setDownloadScope] = useState('all');
  const [downloadFolderUri, setDownloadFolderUri] = useState(null);
  const [isFolderPicking, setIsFolderPicking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [lastDownload, setLastDownload] = useState(null);
  const downloadInProgress = useRef(false);

  /* Import modal state */
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState(null);
  const importInProgress = useRef(false);

  const totalNetValue = getTotalBalance();

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DOWNLOAD_FOLDER_KEY)
      .then((uri) => {
        if (mounted && uri) setDownloadFolderUri(uri);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  /* ----------------------------- Download data --------------------------- */
  const openDownloadModal = (format) => {
    if (isDownloading) {
      toast('Please wait for the current download to finish', 'info');
      return;
    }

    setDownloadFormat(format);
    setDownloadScope('all');
    setDownloadError('');
    setLastDownload(null);
    setIsDownloadModalOpen(true);
  };

  const selectDownloadFormat = (format) => {
    if (isDownloading) return;
    setDownloadFormat(format);
    setLastDownload(null);
    setDownloadError('');
  };

  const selectDownloadScope = (scope) => {
    if (isDownloading) return;
    setDownloadScope(scope);
    setLastDownload(null);
    setDownloadError('');
  };

  const getScopeData = (scope) => {
    if (scope === 'all') {
      return {
        isAll: true,
        label: 'All Data',
        capitals,
        sources,
        expenses,
        transactions,
        fund,
      };
    }

    const capital = capitals.find((c) => c.id === scope);
    if (!capital) return null;

    return {
      isAll: false,
      label: capital.name,
      capital,
      capitals: [capital],
      sources: sources.filter((s) => s.capitalId === capital.id),
      expenses: expenses.filter((e) => e.capitalId === capital.id),
      transactions: transactions.filter((t) => t.capitalId === capital.id),
      fund: [],
    };
  };

  const scopeTotals = (data) => {
    const added = data.sources.reduce(
      (sum, source) => sum + Number(source.amount || 0),
      0
    );
    const spent = data.expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );
    return { added, spent, balance: added - spent };
  };

  const capitalName = (capitalId) =>
    capitals.find((capital) => capital.id === capitalId)?.name ||
    'Unknown Capital';

  const buildPdfHtml = (data) => {
    const { added, spent, balance } = scopeTotals(data);
    const reportTitle = data.isAll
      ? 'Money Tracker Report'
      : `${data.capital.name} Report`;

    const summaryRows = data.isAll
      ? `<p class="summary">Total Balance: ${money(
          settings.currency,
          totalNetValue
        )}</p>`
      : `<p class="summary">Current Balance: ${money(
          settings.currency,
          balance
        )}</p>
         <p class="summary">Total Added: ${money(
           settings.currency,
           added
         )}</p>
         <p class="summary">Total Spent: ${money(
           settings.currency,
           spent
         )}</p>`;

    const capitalRows = data.capitals
      .map((capital) => {
        const rowBalance = data.isAll
          ? getCapitalBalance(capital.id)
          : balance;
        const rowInitial = data.isAll ? getInitialBalance(capital.id) : added;

        return `
      <tr>
        <td>${escapeHtml(capital.name)}</td>
        <td>${escapeHtml(
          capital.color.charAt(0).toUpperCase() + capital.color.slice(1)
        )}</td>
        <td>${money(settings.currency, rowBalance)}</td>
        <td>${money(settings.currency, rowInitial)}</td>
        <td>${
          capital.createdAt
            ? escapeHtml(new Date(capital.createdAt).toLocaleDateString())
            : 'N/A'
        }</td>
      </tr>
    `;
      })
      .join('');

    const sourcesRows = data.sources
      .map(
        (source) => `
      <tr>
        <td>${escapeHtml(source.title)}</td>
        <td>${escapeHtml(capitalName(source.capitalId))}</td>
        <td>${money(settings.currency, source.amount)}</td>
        <td>${escapeHtml(source.breakdown || 'No breakdown')}</td>
        <td>${escapeHtml(new Date(source.date).toLocaleDateString())}</td>
      </tr>
    `
      )
      .join('');

    const fundRows = data.fund
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

    const expensesRows = data.expenses
      .map(
        (expense) => `
      <tr>
        <td>${escapeHtml(expense.title)}</td>
        <td>${escapeHtml(capitalName(expense.capitalId))}</td>
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

    const transactionsRows = data.transactions
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
          transaction.capitalName || capitalName(transaction.capitalId)
        )}</td>
      </tr>
    `
      )
      .join('');

    return `
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
            .summary { font-size: 14px; margin: 6px 0; }
            .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(reportTitle)}</h1>
          <p class="meta">Scope: ${escapeHtml(data.label)}</p>
          <p class="meta">Exported on: ${escapeHtml(new Date().toLocaleString())}</p>
          <hr />

          <h2>Financial Summary</h2>
          ${summaryRows}

          ${
            data.capitals.length > 0
              ? `<h2>Capitals (Detailed)</h2>
                 <table>
                   <tr><th>Name</th><th>Color</th><th>Current Balance</th><th>Initial Balance</th><th>Created Date</th></tr>
                   ${capitalRows}
                 </table>`
              : ''
          }

          ${
            data.sources.length > 0
              ? `<h2>Funds Added (Detailed)</h2>
                 <table>
                   <tr><th>Title</th><th>Capital</th><th>Amount</th><th>Breakdown</th><th>Date</th></tr>
                   ${sourcesRows}
                 </table>`
              : ''
          }

          ${
            data.fund.length > 0
              ? `<h2>Fund Records</h2>
                 <table>
                   <tr><th>Name</th><th>Description</th><th>Status</th></tr>
                   ${fundRows}
                 </table>`
              : ''
          }

          ${
            data.expenses.length > 0
              ? `<h2>Expenses (Detailed)</h2>
                 <table>
                   <tr><th>Title</th><th>Capital</th><th>Amount</th><th>Reason</th><th>Breakdown</th><th>Date</th><th>Before</th><th>After</th></tr>
                   ${expensesRows}
                 </table>`
              : ''
          }

          ${
            data.transactions.length > 0
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
            <tr><td>Scope</td><td>${escapeHtml(data.label)}</td></tr>
            <tr><td>Currency</td><td>${escapeHtml(settings.currency)}</td></tr>
            <tr><td>Dark Mode</td><td>${settings.darkMode ? 'Enabled' : 'Disabled'}</td></tr>
          </table>

          <p class="footer">Generated by MTrack</p>
        </body>
      </html>
    `;
  };

  const buildJsonPayload = (data) => ({
    app: 'MTrack',
    exportType: data.isAll ? 'all' : 'capital',
    scope: data.isAll
      ? { type: 'all', label: 'All Data' }
      : {
          type: 'capital',
          capitalId: data.capital.id,
          label: data.capital.name,
        },
    exportDate: new Date().toISOString(),
    capitals: data.capitals,
    fund: data.fund,
    sources: data.sources,
    expenses: data.expenses,
    transactions: data.transactions,
    settings,
  });

  const buildFileName = (data, extension) => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}-${String(
      now.getMinutes()
    ).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const rawSlug = data.isAll
      ? 'all-data'
      : (data.capital.name || 'capital')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

    const slug = rawSlug.slice(0, 40) || 'capital';
    return `mtrack_${slug}_${date}_${time}.${extension}`;
  };

  const pickDownloadFolder = async () => {
    if (Platform.OS !== 'android') return null;

    setIsFolderPicking(true);
    try {
      const directory = await Directory.pickDirectoryAsync(
        ANDROID_DOWNLOADS_INITIAL_URI
      );
      const uri = directory.uri;
      setDownloadFolderUri(uri);
      // The folder still works for this session even if persistence fails.
      await AsyncStorage.setItem(DOWNLOAD_FOLDER_KEY, uri).catch(() => {});
      return directory;
    } finally {
      setIsFolderPicking(false);
    }
  };

  const handleChooseFolder = async () => {
    try {
      await pickDownloadFolder();
      toast('Download folder updated', 'success');
    } catch (error) {
      if (!isPickerCancel(error)) {
        console.error(error);
        toast('Could not update the download folder', 'error');
      }
    }
  };

  const writeToAndroidFolder = async (bytes, fileName, mimeType) => {
    const writeFile = (directory) => {
      const file = directory.createFile(fileName, mimeType);
      file.write(bytes);
      return file;
    };

    if (downloadFolderUri) {
      try {
        return writeFile(new Directory(downloadFolderUri));
      } catch (error) {
        // The saved folder may have been removed or its permission revoked.
        await AsyncStorage.removeItem(DOWNLOAD_FOLDER_KEY).catch(() => {});
        setDownloadFolderUri(null);
      }
    }

    const picked = await pickDownloadFolder();
    if (!picked) return null;
    return writeFile(picked);
  };

  const tryDirectDownloadsWrite = (bytes, fileName, mimeType) => {
    try {
      const directory = new Directory(ANDROID_PUBLIC_DOWNLOADS_URI);
      if (!directory.exists) return null;

      const file = directory.createFile(fileName, mimeType);
      file.write(bytes);
      return file;
    } catch (error) {
      // Scoped storage on Android 10+ blocks this; use the SAF folder below.
      return null;
    }
  };

  const saveFile = async (cacheFile, fileName, mimeType) => {
    if (Platform.OS === 'ios') {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(cacheFile.uri, {
        mimeType,
        dialogTitle: fileName,
        UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.json',
      });
      return { shared: true, fileName };
    }

    const bytes = await cacheFile.bytes();

    // On older devices this writes straight into the public Download folder.
    const direct = tryDirectDownloadsWrite(bytes, fileName, mimeType);
    if (direct) {
      return {
        shared: false,
        fileName,
        uri: direct.uri,
        folderLabel: 'Downloads',
      };
    }

    const saved = await writeToAndroidFolder(bytes, fileName, mimeType);
    if (!saved) return null;

    return {
      shared: false,
      fileName,
      uri: saved.uri,
      folderLabel: folderLabelFromUri(saved.uri),
    };
  };

  const handleDownload = async () => {
    if (downloadInProgress.current) return;

    setDownloadError('');
    setLastDownload(null);

    const data = getScopeData(downloadScope);
    if (!data) {
      setDownloadError('Choose what you want to download.');
      return;
    }

    downloadInProgress.current = true;
    setIsDownloading(true);
    try {
      if (downloadFormat === 'pdf') {
        const html = buildPdfHtml(data);
        const { uri } = await Print.printToFileAsync({ html });
        const fileName = buildFileName(data, 'pdf');
        const result = await saveFile(
          new File(uri),
          fileName,
          'application/pdf'
        );

        if (!result) {
          setDownloadError('Download cancelled. Choose a folder to save the PDF.');
          return;
        }

        setLastDownload(result);
        toast(
          result.shared ? 'PDF ready to save' : `PDF saved: ${fileName}`,
          'success'
        );
      } else {
        const fileName = buildFileName(data, 'json');
        const file = new File(Paths.cache, fileName);
        file.create({ overwrite: true, intermediates: true });
        file.write(JSON.stringify(buildJsonPayload(data), null, 2));

        const result = await saveFile(file, fileName, 'application/json');

        if (!result) {
          setDownloadError('Download cancelled. Choose a folder to save the file.');
          return;
        }

        setLastDownload(result);
        toast(
          result.shared ? 'JSON ready to save' : `JSON saved: ${fileName}`,
          'success'
        );
      }
    } catch (error) {
      console.error(error);
      if (isPickerCancel(error)) {
        setDownloadError('Download cancelled.');
      } else {
        setDownloadError(
          Platform.OS === 'android'
            ? 'Could not save the file. Pick the Downloads folder and try again.'
            : 'Could not create the file. Please try again.'
        );
      }
    } finally {
      downloadInProgress.current = false;
      setIsDownloading(false);
    }
  };

  const folderLabelFromUri = (uri) => {
    if (!uri) return 'Choose a folder on first download';

    try {
      return /download/i.test(decodeURIComponent(uri))
        ? 'Downloads'
        : 'Selected folder';
    } catch (error) {
      return 'Selected folder';
    }
  };

  const getFolderLabel = () => folderLabelFromUri(downloadFolderUri);

  const renderScopeOption = ({ id, title, subtitle, icon, color }) => {
    const active = downloadScope === id;

    return (
      <TouchableOpacity
        key={id}
        onPress={() => selectDownloadScope(id)}
        activeOpacity={0.8}
        style={[
          styles.scopeRow,
          {
            backgroundColor: colors.card,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
      >
        {icon ? (
          <View style={[styles.scopeIcon, { backgroundColor: colors.input }]}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
        ) : (
          <View
            style={[
              styles.scopeDot,
              { backgroundColor: color || colors.primary },
            ]}
          />
        )}
        <View style={styles.scopeInfo}>
          <Text style={[styles.scopeTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.scopeSubtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        </View>
        <View
          style={[
            styles.radio,
            { borderColor: active ? colors.primary : colors.border },
          ]}
        >
          {active ? (
            <View
              style={[styles.radioDot, { backgroundColor: colors.primary }]}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    );
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
  const openImportModal = () => {
    if (isImporting) {
      toast('Please wait for the current import to finish', 'info');
      return;
    }

    setImportFile(null);
    setImportMode('merge');
    setImportError('');
    setLastImport(null);
    setIsImportModalOpen(true);
  };

  const closeImportModal = () => {
    if (isImporting) return;
    setIsImportModalOpen(false);
  };

  const handlePickImportFile = async () => {
    if (isImporting) return;

    setImportError('');

    try {
      // Accept any file: Android file providers often report JSON as
      // "application/octet-stream", so parsing is the real gate.
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      setImportFile(null);
      setLastImport(null);

      if (asset.size && asset.size > MAX_IMPORT_BYTES) {
        setImportError('That file is too large to import (maximum 25 MB).');
        return;
      }

      const content = await new File(asset.uri).text();

      if (content.length > MAX_IMPORT_BYTES) {
        setImportError('That file is too large to import (maximum 25 MB).');
        return;
      }

      const parsed = parseBackup(content, asset.name || 'backup.json');

      setImportFile({
        ...parsed,
        name: asset.name || 'backup.json',
        size: asset.size || content.length,
      });
      setImportMode('merge');
    } catch (error) {
      console.error(error);
      setImportError(
        error?.message || 'Could not read that file. Please try another one.'
      );
    }
  };

  const handleImportData = async () => {
    if (!importFile || importInProgress.current) return;

    const { payload, meta } = importFile;

    if (importMode === 'replace') {
      const ok = await confirm(
        meta.isCapitalExport ? 'Replace this capital?' : 'Replace all data?',
        meta.isCapitalExport
          ? `This removes the existing "${meta.scopeLabel}" capital and its records, then restores the backup. Other capitals stay untouched.`
          : 'This removes all current capitals, funds, expenses and transactions, then restores the backup. This cannot be undone.'
      );
      if (!ok) return;
    }

    importInProgress.current = true;
    setIsImporting(true);
    setImportError('');

    try {
      const summary = importData(payload, { mode: importMode });
      setLastImport({ ...summary, fileName: importFile.name });
      toast('Data imported successfully!', 'success');
    } catch (error) {
      console.error(error);
      setImportError(
        error?.message || 'Import failed. Please try again with a valid backup.'
      );
    } finally {
      importInProgress.current = false;
      setIsImporting(false);
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
        {/* <View
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
        </View> */}

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
              onPress={() => openDownloadModal('pdf')}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.input }]}>
                  <Ionicons name="document-text" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Download Data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            {/* <TouchableOpacity
              onPress={() => openDownloadModal('json')}
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
            </TouchableOpacity> */}

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
              onPress={openImportModal}
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
                  Stable Build 2026.10.28
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

      {/* Download Data Modal */}
      <Modal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title="Download Data"
      >
        <Text style={[styles.downloadDesc, { color: colors.muted }]}>
          Choose a format, then download everything or one specific capital.
        </Text>

        <Text style={[styles.downloadLabel, { color: colors.label }]}>
          FORMAT
        </Text>
        <View style={styles.formatRow}>
          {[
            {
              id: 'pdf',
              icon: 'document-text',
              title: 'PDF Report',
              subtitle: 'Summary + tables',
            },
            {
              id: 'json',
              icon: 'code-slash',
              title: 'JSON Backup',
              subtitle: 'Raw data file',
            },
          ].map((option) => {
            const active = downloadFormat === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => selectDownloadFormat(option.id)}
                activeOpacity={0.8}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: colors.input,
                    borderColor: active ? colors.primary : colors.border,
                  },
                  active && { backgroundColor: colors.primary + '12' },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={active ? colors.primary : colors.muted}
                />
                <Text
                  style={[
                    styles.formatTitle,
                    { color: active ? colors.primary : colors.foreground },
                  ]}
                >
                  {option.title}
                </Text>
                <Text style={[styles.formatSubtitle, { color: colors.muted }]}>
                  {option.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={[
            styles.downloadLabel,
            { color: colors.label, marginTop: 20 },
          ]}
        >
          WHAT TO INCLUDE
        </Text>

        {renderScopeOption({
          id: 'all',
          title: 'All Data',
          subtitle: `${capitals.length} capitals · ${expenses.length} expenses · ${transactions.length} transactions`,
          icon: 'layers',
        })}

        {capitals.map((capital) => {
          const capitalSources = sources.filter(
            (source) => source.capitalId === capital.id
          );
          const capitalExpenses = expenses.filter(
            (expense) => expense.capitalId === capital.id
          );

          return renderScopeOption({
            id: capital.id,
            title: capital.name,
            subtitle: `${settings.currency}${getCapitalBalance(
              capital.id
            ).toLocaleString()} · ${capitalSources.length} funds · ${
              capitalExpenses.length
            } expenses`,
            color: CAPITAL_COLORS[capital.color] || CAPITAL_COLORS.blue,
          });
        })}

        {capitals.length === 0 && (
          <Text style={[styles.downloadEmpty, { color: colors.muted }]}>
            No capitals yet. Add a capital to download a specific report.
          </Text>
        )}

        {Platform.OS === 'android' ? (
          <>
            <View
              style={[
                styles.folderCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.scopeIcon, { backgroundColor: colors.input }]}>
                <Ionicons
                  name="folder-open"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.scopeInfo}>
                <Text style={[styles.scopeTitle, { color: colors.foreground }]}>
                  Save to
                </Text>
                <Text style={[styles.scopeSubtitle, { color: colors.muted }]}>
                  {getFolderLabel()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleChooseFolder}
                disabled={isFolderPicking || isDownloading}
                style={[styles.changeFolderBtn, { backgroundColor: colors.input }]}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.changeFolderText, { color: colors.primary }]}
                >
                  {isFolderPicking ? '...' : 'Change'}
                </Text>
              </TouchableOpacity>
            </View>

            {!downloadFolderUri && (
              <View
                style={[
                  styles.downloadHint,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.muted}
                />
                <Text
                  style={[styles.downloadHintText, { color: colors.muted }]}
                >
                  First download: choose the Download folder once. After that,
                  every PDF/JSON saves there directly.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View
            style={[
              styles.downloadHint,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.muted}
            />
            <Text style={[styles.downloadHintText, { color: colors.muted }]}>
              On iOS, the file opens in the share sheet so you can save it to
              Files.
            </Text>
          </View>
        )}

        {downloadFormat === 'json' && downloadScope !== 'all' && (
          <View
            style={[
              styles.downloadHint,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
            <Text style={[styles.downloadHintText, { color: colors.muted }]}>
              Capital JSON is a partial backup. Import it with Merge to add its
              records, or with Replace capital to restore only this capital.
            </Text>
          </View>
        )}

        {downloadError ? (
          <Text style={styles.downloadError}>{downloadError}</Text>
        ) : null}

        {lastDownload ? (
          <View style={[styles.downloadSuccess, { borderColor: '#10b98160' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text
              style={[
                styles.downloadSuccessText,
                { color: colors.foreground },
              ]}
            >
              {lastDownload.shared
                ? 'File ready in the share sheet.'
                : `Saved to ${lastDownload.folderLabel}: ${lastDownload.fileName}`}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleDownload}
          disabled={isDownloading || isFolderPicking}
          activeOpacity={0.9}
          style={[
            styles.downloadBtn,
            { backgroundColor: colors.primary },
            (isDownloading || isFolderPicking) && { opacity: 0.6 },
          ]}
        >
          {isDownloading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons name="download" size={20} color="#ffffff" />
          )}
          <Text style={styles.downloadBtnText}>
            {isDownloading
              ? 'Preparing file...'
              : Platform.OS === 'android' && !downloadFolderUri
                ? 'Choose folder & download'
                : `Download ${downloadFormat.toUpperCase()}`}
          </Text>
        </TouchableOpacity>
      </Modal>

      {/* Import Data Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        title="Import Data"
      >
        <Text style={[styles.downloadDesc, { color: colors.muted }]}>
          Restore a JSON backup created by MTrack. Pick a full backup or a
          single-capital backup, review what it contains, then import it.
        </Text>

        <Text style={[styles.downloadLabel, { color: colors.label }]}>
          BACKUP FILE
        </Text>

        <View
          style={[
            styles.importFileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.scopeIcon, { backgroundColor: colors.input }]}>
            <Ionicons
              name={importFile ? 'document-text' : 'cloud-upload-outline'}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.scopeInfo}>
            <Text
              style={[styles.importFileName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {importFile ? importFile.name : 'No file selected'}
            </Text>
            <Text style={[styles.importFileMeta, { color: colors.muted }]}>
              {importFile
                ? formatFileSize(importFile.size)
                : 'Choose a .json backup from your device'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handlePickImportFile}
            disabled={isImporting}
            style={[styles.changeFolderBtn, { backgroundColor: colors.input }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.changeFolderText, { color: colors.primary }]}>
              {importFile ? 'Change' : 'Browse'}
            </Text>
          </TouchableOpacity>
        </View>

        {importError ? (
          <Text style={styles.downloadError}>{importError}</Text>
        ) : null}

        {importFile ? (
          <>
            <View
              style={[
                styles.importPreview,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.importPreviewHeader}>
                <Text
                  style={[
                    styles.importPreviewTitle,
                    { color: colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {importFile.meta.scopeLabel}
                </Text>
                <View
                  style={[
                    styles.importBadge,
                    { backgroundColor: colors.primary + '18' },
                  ]}
                >
                  <Text
                    style={[styles.importBadgeText, { color: colors.primary }]}
                  >
                    {importFile.meta.isCapitalExport
                      ? 'CAPITAL BACKUP'
                      : 'FULL BACKUP'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.importPreviewMeta, { color: colors.muted }]}>
                {formatExportDate(importFile.meta.exportDate)
                  ? `Exported ${formatExportDate(importFile.meta.exportDate)}`
                  : 'Export date not available'}
                {importFile.meta.currency
                  ? ` · Currency ${importFile.meta.currency}`
                  : ''}
              </Text>

              <View style={styles.importCountsRow}>
                {[
                  ['capitals', 'capitals'],
                  ['fund', 'fund records'],
                  ['sources', 'fund entries'],
                  ['expenses', 'expenses'],
                  ['transactions', 'transactions'],
                ].map(([key, label]) => (
                  <View
                    key={key}
                    style={[
                      styles.importCountChip,
                      { backgroundColor: colors.input },
                    ]}
                  >
                    <Text
                      style={[
                        styles.importCountText,
                        { color: colors.foreground },
                      ]}
                    >
                      {importFile.meta.counts[key]} {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Text
              style={[
                styles.downloadLabel,
                { color: colors.label, marginTop: 20 },
              ]}
            >
              IMPORT MODE
            </Text>

            <View style={styles.formatRow}>
              {(importFile.meta.isCapitalExport
                ? [
                    {
                      id: 'merge',
                      icon: 'git-merge',
                      title: 'Merge',
                      subtitle: 'Add to current data',
                    },
                    {
                      id: 'replace',
                      icon: 'refresh',
                      title: 'Replace capital',
                      subtitle: 'Only this capital',
                    },
                  ]
                : [
                    {
                      id: 'merge',
                      icon: 'git-merge',
                      title: 'Merge',
                      subtitle: 'Keep current data',
                    },
                    {
                      id: 'replace',
                      icon: 'refresh',
                      title: 'Replace all',
                      subtitle: 'Restore exactly',
                    },
                  ]
              ).map((option) => {
                const active = importMode === option.id;
                const activeColor =
                  option.id === 'replace' ? colors.danger : colors.primary;

                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => {
                      if (isImporting) return;
                      setImportMode(option.id);
                      setLastImport(null);
                    }}
                    activeOpacity={0.8}
                    disabled={isImporting}
                    style={[
                      styles.formatCard,
                      {
                        backgroundColor: colors.input,
                        borderColor: active ? activeColor : colors.border,
                      },
                      active && { backgroundColor: activeColor + '12' },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={active ? activeColor : colors.muted}
                    />
                    <Text
                      style={[
                        styles.formatTitle,
                        { color: active ? activeColor : colors.foreground },
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text
                      style={[styles.formatSubtitle, { color: colors.muted }]}
                    >
                      {option.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[
                styles.downloadHint,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.muted}
              />
              <Text style={[styles.downloadHintText, { color: colors.muted }]}>
                {importMode === 'merge'
                  ? 'Merge keeps your current data. Records with the same ID are skipped, so importing the same backup twice is safe. Currency and theme stay unchanged.'
                  : importFile.meta.isCapitalExport
                    ? 'Only this capital and its records are replaced. Other capitals stay untouched.'
                    : 'Everything currently in the app is removed and replaced by this backup, including currency and theme. This cannot be undone.'}
              </Text>
            </View>
          </>
        ) : null}

        {lastImport ? (
          <View style={[styles.downloadSuccess, { borderColor: '#10b98160' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text
              style={[styles.downloadSuccessText, { color: colors.foreground }]}
            >
              {describeImport(lastImport)}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={lastImport ? closeImportModal : handleImportData}
          disabled={!importFile || isImporting}
          activeOpacity={0.9}
          style={[
            styles.downloadBtn,
            {
              backgroundColor:
                !lastImport && importMode === 'replace'
                  ? colors.danger
                  : colors.primary,
            },
            (!importFile || isImporting) && { opacity: 0.6 },
          ]}
        >
          {isImporting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons
              name={lastImport ? 'checkmark' : 'cloud-upload'}
              size={20}
              color="#ffffff"
            />
          )}
          <Text style={styles.downloadBtnText}>
            {isImporting
              ? 'Importing...'
              : lastImport
                ? 'Done'
                : importMode === 'replace'
                  ? importFile?.meta.isCapitalExport
                    ? 'Replace this capital'
                    : 'Replace all data'
                  : 'Import Data'}
          </Text>
        </TouchableOpacity>
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
  downloadDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  downloadLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  formatRow: { flexDirection: 'row', gap: 12 },
  formatCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  formatTitle: { fontSize: 14, fontWeight: '700' },
  formatSubtitle: { fontSize: 11, lineHeight: 15 },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  scopeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 13 },
  scopeInfo: { flex: 1 },
  scopeTitle: { fontSize: 14, fontWeight: '600' },
  scopeSubtitle: { fontSize: 11, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  downloadEmpty: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  changeFolderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  changeFolderText: { fontSize: 12, fontWeight: '700' },
  downloadHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  downloadHintText: { flex: 1, fontSize: 11, lineHeight: 16 },
  downloadError: {
    color: '#f43f5e',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  downloadSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#10b98115',
    marginTop: 12,
  },
  downloadSuccessText: { flex: 1, fontSize: 12, fontWeight: '600' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  downloadBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  importFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  importFileName: { fontSize: 14, fontWeight: '600' },
  importFileMeta: { fontSize: 11, marginTop: 2 },
  importPreview: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  importPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  importPreviewTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  importBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  importBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  importPreviewMeta: { fontSize: 11, lineHeight: 16 },
  importCountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  importCountChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  importCountText: { fontSize: 11, fontWeight: '600' },
});
