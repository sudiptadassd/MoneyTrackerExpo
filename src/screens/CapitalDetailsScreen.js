import React, { useEffect, useState } from 'react';
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
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const THEMES = [
  { id: 'blue', color: '#3b82f6' },
  { id: 'emerald', color: '#10b981' },
  { id: 'rose', color: '#f43f5e' },
  { id: 'amber', color: '#f59e0b' },
  { id: 'indigo', color: '#6366f1' },
  { id: 'violet', color: '#8b5cf6' },
  { id: 'purple', color: '#a855f7' },
  { id: 'pink', color: '#ec4899' },
  { id: 'cyan', color: '#06b6d4' },
  { id: 'teal', color: '#14b8a6' },
  { id: 'lime', color: '#84cc16' },
  { id: 'orange', color: '#f97316' },
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

/* Common cash denominations for each supported currency (notes + coins) */
const DENOMINATIONS = {
  '\u20B9': [1, 2, 5, 10, 20, 50, 100, 200, 500, 2000],
  '$': [1, 2, 5, 10, 20, 50, 100],
  '\u20AC': [1, 2, 5, 10, 20, 50, 100, 200, 500],
  '\u00A3': [1, 2, 5, 10, 20, 50],
  '\u09F3': [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
};

const DEFAULT_DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100];

const EMPTY_FUND_FORM = { note: null, quantity: '', description: '' };

const getNoteOptions = (currency, currentNote) => {
  const options = [...(DENOMINATIONS[currency] || DEFAULT_DENOMINATIONS)];
  const numeric = Number(currentNote);

  // Keep legacy/custom values selectable when editing an old fund.
  if (Number.isFinite(numeric) && numeric > 0 && !options.includes(numeric)) {
    options.push(numeric);
  }

  return options.sort((a, b) => a - b);
};

const sanitizeDescription = (text) =>
  text
    .trim()
    .replace(/,/g, ';')
    .replace(/\s+-\s+/g, ' \u2013 ');

/* Inline dropdown for picking a note/coin denomination */
const NoteSelect = ({ value, onChange, currency, colors }) => {
  const [open, setOpen] = useState(false);
  const options = getNoteOptions(currency, value);
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.8}
        style={[
          styles.select,
          {
            backgroundColor: colors.input,
            borderColor: open ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.selectText,
            { color: hasValue ? colors.foreground : colors.placeholder },
          ]}
        >
          {hasValue
            ? `${currency}${Number(value).toLocaleString()}`
            : 'Select a note'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
        />
      </TouchableOpacity>

      {open && (
        <View
          style={[
            styles.optionGrid,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          {options.map((option) => {
            const isSelected = Number(option) === Number(value);
            return (
              <TouchableOpacity
                key={String(option)}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                activeOpacity={0.7}
                style={[
                  styles.optionChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    { color: isSelected ? '#ffffff' : colors.foreground },
                  ]}
                >
                  {currency}
                  {Number(option).toLocaleString()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

/* Number input with a quick 1-10 picker; any number can be typed manually */
const QuantityInput = ({ value, onChange, colors }) => {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <View style={styles.quantityRow}>
        <TextInput
          style={[
            styles.quantityInput,
            { color: colors.foreground, backgroundColor: colors.input },
          ]}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity
          onPress={() => setOpen((prev) => !prev)}
          activeOpacity={0.8}
          style={[
            styles.quantityDropdownBtn,
            {
              backgroundColor: colors.input,
              borderColor: open ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={[styles.quantityDropdownText, { color: colors.muted }]}>
            1-10
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>

      {open && (
        <View
          style={[
            styles.quantityGrid,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((quantity) => {
            const isSelected = String(quantity) === String(value);
            return (
              <TouchableOpacity
                key={quantity}
                onPress={() => {
                  onChange(String(quantity));
                  setOpen(false);
                }}
                activeOpacity={0.7}
                style={[
                  styles.quantityChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quantityChipText,
                    { color: isSelected ? '#ffffff' : colors.foreground },
                  ]}
                >
                  {quantity}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default function CapitalDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const {
    capitals,
    sources,
    getCapitalBalance,
    addSource,
    updateSource,
    deleteSource,
    updateCapital,
    deleteCapital,
    settings,
  } = useExpenses();
  const { toast } = useFeedback();

  const [capital, setCapital] = useState(null);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditFundModalOpen, setIsEditFundModalOpen] = useState(false);
  const [isDeleteFundModalOpen, setIsDeleteFundModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [fundForm, setFundForm] = useState({ ...EMPTY_FUND_FORM });
  const [editFundForm, setEditFundForm] = useState({ ...EMPTY_FUND_FORM });
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('blue');
  const [fundError, setFundError] = useState('');

  // Collapsible state for each fund item
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    const found = capitals.find((c) => c.id === id);
    if (found) {
      setCapital(found);
      setEditName(found.name);
      setEditColor(found.color);
    }
  }, [id, capitals]);

  if (!capital) return null;

  const balance = getCapitalBalance(id);
  const capitalSources = sources.filter((s) => s.capitalId === id);
  const buttonColor = CAPITAL_COLORS[capital.color] || CAPITAL_COLORS.blue;

  // Latest fund record drives the "Last update" label
  const lastUpdate =
    capitalSources.length > 0
      ? new Date(
          capitalSources.reduce((latest, source) =>
            new Date(source.date) > new Date(latest.date) ? source : latest
          ).date
        ).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A';

  const updateFundField = (field, value) =>
    setFundForm((prev) => ({ ...prev, [field]: value }));

  const updateEditFundField = (field, value) =>
    setEditFundForm((prev) => ({ ...prev, [field]: value }));

  const calculateFundTotal = (form) => {
    const note = Number(form.note) || 0;
    const quantity = Number(form.quantity) || 0;
    return note * quantity;
  };

  const buildBreakdown = (form) => {
    const note = Number(form.note) || 0;
    const quantity = Number(form.quantity) || 0;
    const total = note * quantity;

    if (note <= 0 || quantity <= 0) return '';

    const description = sanitizeDescription(form.description) || 'N/A';
    return `${settings.currency}${note} x ${quantity}: ${description} - ${settings.currency}${total}`;
  };

  const parseFundBreakdown = (source) => {
    if (!source.breakdown) {
      return {
        note: Number(source.amount) || null,
        quantity: '1',
        description: '',
      };
    }

    const parsed = [];

    source.breakdown.split(', ').forEach((part) => {
      const match = part.match(/(.+?):\s*(.+?)\s*-\s*[^\d]*([\d.]+)/);
      if (!match) return;

      const [, type, desc, amt] = match;
      const typeKey = type.trim();
      const amount = Number(amt) || 0;
      const description = desc.trim() === 'N/A' ? '' : desc.trim();
      const quantityMatch = typeKey.match(
        /^(.*?)([\d.,]+)\s*[x\u00D7]\s*([\d.]+)\s*$/i
      );

      if (quantityMatch) {
        const note = Number(quantityMatch[2].replace(/,/g, ''));
        const quantity = quantityMatch[3];

        if (
          note > 0 &&
          Number(quantity) > 0 &&
          Math.abs(note * Number(quantity) - amount) < 0.01
        ) {
          parsed.push({ note, quantity, description });
          return;
        }
      }

      // Legacy entry (e.g. "Big Notes: desc - ₹5000"): keep the amount as the note.
      parsed.push({ note: amount, quantity: '1', description });
    });

    if (parsed.length === 1) return parsed[0];

    if (parsed.length > 1) {
      // Legacy multi-type breakdown: collapse into one total so no money is lost.
      return {
        note:
          Number(source.amount) ||
          parsed.reduce(
            (sum, row) =>
              sum + (Number(row.note) || 0) * (Number(row.quantity) || 0),
            0
          ),
        quantity: '1',
        description: parsed
          .map((row) => row.description)
          .filter(Boolean)
          .join('; '),
      };
    }

    return {
      note: Number(source.amount) || null,
      quantity: '1',
      description: '',
    };
  };

  const handleAddFunds = () => {
    setFundError('');
    const totalAmount = calculateFundTotal(fundForm);

    if (totalAmount <= 0) {
      const message = 'Please select a note and enter a quantity';
      setFundError(message);
      toast(message, 'error');
      return;
    }

    addSource(id, 'Funds Added', buildBreakdown(fundForm), totalAmount);

    setFundForm({ ...EMPTY_FUND_FORM });
    setIsAddFundsModalOpen(false);
    toast('Funds added successfully!', 'success');
  };

  const handleEditFund = (source) => {
    setSelectedFund(source);
    setFundError('');
    setEditFundForm(parseFundBreakdown(source));
    setIsEditFundModalOpen(true);
  };

  const handleUpdateFund = () => {
    setFundError('');
    const totalAmount = calculateFundTotal(editFundForm);

    if (totalAmount <= 0) {
      const message = 'Please select a note and enter a quantity';
      setFundError(message);
      toast(message, 'error');
      return;
    }

    updateSource(
      selectedFund.id,
      'Funds Added',
      buildBreakdown(editFundForm),
      totalAmount
    );

    setIsEditFundModalOpen(false);
    setSelectedFund(null);
    toast('Fund updated successfully!', 'success');
  };

  const handleDeleteFund = (source) => {
    setSelectedFund(source);
    setIsDeleteFundModalOpen(true);
  };

  const confirmDeleteFund = () => {
    if (selectedFund) {
      deleteSource(selectedFund.id);
      setIsDeleteFundModalOpen(false);
      setSelectedFund(null);
      toast('Fund deleted', 'success');
    }
  };

  const toggleItemExpand = (itemId) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleEditCapital = () => {
    updateCapital(id, editName, editColor);
    setIsEditModalOpen(false);
    toast('Capital updated successfully!', 'success');
  };

  const handleDeleteCapital = () => {
    deleteCapital(id);
    setIsDeleteModalOpen(false);
    toast('Capital deleted', 'success');
    navigation.goBack();
  };

  const renderFundForm = (form, updateField) => {
    const note = Number(form.note) || 0;
    const quantity = Number(form.quantity) || 0;
    const total = note * quantity;

    return (
      <View style={styles.fundForm}>
        <Text style={[styles.fieldLabel, { color: colors.label }]}>
          Note / Coin
        </Text>
        <NoteSelect
          value={form.note}
          onChange={(noteValue) => updateField('note', noteValue)}
          currency={settings.currency}
          colors={colors}
        />

        <Text
          style={[styles.fieldLabel, { color: colors.label, marginTop: 16 }]}
        >
          Quantity
        </Text>
        <QuantityInput
          value={form.quantity}
          onChange={(quantityValue) => updateField('quantity', quantityValue)}
          colors={colors}
        />

        <View
          style={[
            styles.totalBox,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          <View style={styles.totalBoxLeft}>
            <Text style={[styles.totalBoxLabel, { color: colors.muted }]}>
              TOTAL
            </Text>
            <Text style={[styles.totalBoxEquation, { color: colors.muted }]}>
              {note > 0 && quantity > 0
                ? `${settings.currency}${note.toLocaleString()} \u00D7 ${quantity}`
                : 'Select a note and quantity'}
            </Text>
          </View>
          <Text style={[styles.totalBoxValue, { color: colors.heading }]}>
            {settings.currency}
            {total.toLocaleString()}
          </Text>
        </View>

        <Text
          style={[styles.fieldLabel, { color: colors.label, marginTop: 16 }]}
        >
          Description
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.foreground, backgroundColor: colors.input },
          ]}
          placeholder="e.g., Rent money, groceries, pocket cash"
          placeholderTextColor={colors.placeholder}
          value={form.description}
          onChangeText={(text) => updateField('description', text)}
        />
      </View>
    );
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.heading }]} numberOfLines={1}>
              {capital.name}
            </Text>
          </View>
        </View>

        {/* Balance Card */}
        <View
          style={[
            styles.balanceCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.balanceInner}>
            <Text style={[styles.balanceLabel, { color: colors.muted }]}>
              Current Balance
            </Text>
            <Text style={[styles.balanceAmount, { color: colors.heading }]}>
              <Text style={styles.balanceCurrency}>{settings.currency}</Text>
              {balance.toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setFundError('');
              setFundForm({ ...EMPTY_FUND_FORM });
              setIsAddFundsModalOpen(true);
            }}
            style={[styles.addFundsBtn, { backgroundColor: buttonColor }]}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFundsText}>Add Funds</Text>
          </TouchableOpacity>
        </View>

        {/* Funds Breakdown */}
        {capitalSources.length > 0 ? (
          <View
            style={[
              styles.fundsSection,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.fundsHeader}>
              <Text style={[styles.fundsTitle, { color: colors.heading }]}>
                {capital.name}
              </Text>
              <Text style={[styles.fundsDate, { color: colors.muted }]}>
                Last update: {lastUpdate}
              </Text>
            </View>

            {capitalSources.map((source) => {
              const sourceFunds = [];
              if (source.breakdown) {
                source.breakdown.split(', ').forEach((part) => {
                  const match = part.match(/(.+?):\s*(.+?)\s*-\s*[^\d]*([\d.]+)/);
                  if (match) {
                    const [, type, desc, amt] = match;
                    sourceFunds.push({
                      type: type.trim(),
                      description: desc.trim(),
                      amount: Number(amt),
                    });
                  }
                });
              }

              return (
                <View
                  key={source.id}
                  style={[styles.fundItem, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.fundItemHeader}>
                    <View style={styles.fundItemInfo}>
                      <Text style={[styles.fundTotal, { color: colors.heading }]}>
                        Total: {settings.currency}
                        {source.amount.toLocaleString()}
                      </Text>
                      <Text style={[styles.fundDate, { color: colors.muted }]}>
                        {new Date(source.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.fundActions}>
                      <TouchableOpacity
                        onPress={() => handleEditFund(source)}
                        style={styles.fundActionBtn}
                      >
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteFund(source)}
                        style={styles.fundActionBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {sourceFunds.length > 0 && (
                    <View style={styles.fundDetails}>
                      {sourceFunds.map((item, idx) => {
                        const itemId = `${source.id}-${idx}`;
                        const isExpanded = expandedItems[itemId] || false;

                        return (
                          <View key={idx}>
                            <TouchableOpacity
                              onPress={() => toggleItemExpand(itemId)}
                              style={styles.fundDetailRow}
                              activeOpacity={0.7}
                            >
                              <View style={styles.fundDetailLeft}>
                                <View
                                  style={[
                                    styles.fundDot,
                                    { backgroundColor: colors.muted },
                                  ]}
                                />
                                <View>
                                  <Text
                                    style={[
                                      styles.fundDetailType,
                                      { color: colors.foreground },
                                    ]}
                                  >
                                    {item.type.replace(/\s*x\s*(\d+)\s*$/i, ' \u00D7 $1')}:
                                  </Text>
                                  <Text
                                    style={[
                                      styles.fundDetailAmount,
                                      { color: colors.muted },
                                    ]}
                                  >
                                    {settings.currency}
                                    {item.amount.toLocaleString()}
                                  </Text>
                                </View>
                              </View>
                              <Ionicons
                                name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                                size={14}
                                color={colors.muted}
                              />
                            </TouchableOpacity>

                            {isExpanded && (
                              <View
                                style={[
                                  styles.fundDetailDescWrap,
                                  { borderLeftColor: colors.border },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.fundDetailDesc,
                                    { color: colors.muted },
                                  ]}
                                >
                                  <Text style={styles.fundDetailDescLabel}>
                                    Description:
                                  </Text>{' '}
                                  {item.description !== 'N/A'
                                    ? item.description
                                    : 'No description'}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.emptyFunds,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="wallet-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyFundsText, { color: colors.muted }]}>
              No funds added yet. Tap "Add Funds" to record your first fund.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Funds Modal */}
      <Modal
        isOpen={isAddFundsModalOpen}
        onClose={() => setIsAddFundsModalOpen(false)}
        title="Add Funds to Wallet"
      >
        <Text style={[styles.modalDesc, { color: colors.muted }]}>
          Pick a note, enter how many you have, then describe this amount.
        </Text>

        {renderFundForm(fundForm, updateFundField)}

        {/* Balance Summary */}
        <View style={[styles.summary, { borderTopColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              Before Balance:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {settings.currency}
              {balance.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabelGreen]}>Amount to Add:</Text>
            <Text style={[styles.summaryValueGreen]}>
              {settings.currency}
              {calculateFundTotal(fundForm).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.divider, { borderTopColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabelBold, { color: colors.foreground }]}>
              After Balance:
            </Text>
            <Text style={[styles.summaryValueBold, { color: colors.heading }]}>
              {settings.currency}
              {(balance + calculateFundTotal(fundForm)).toLocaleString()}
            </Text>
          </View>
        </View>

        {fundError ? <Text style={styles.formError}>{fundError}</Text> : null}

        <TouchableOpacity
          onPress={handleAddFunds}
          style={[styles.submitBtn, { backgroundColor: buttonColor }]}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>Add Funds</Text>
        </TouchableOpacity>
      </Modal>

      {/* Edit Capital Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Capital"
      >
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>Capital Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.foreground, backgroundColor: colors.input },
            ]}
            placeholder="e.g., Pocket, Money Bag, Bank"
            placeholderTextColor={colors.placeholder}
            value={editName}
            onChangeText={setEditName}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>Theme Color</Text>
          <View style={styles.colorGrid}>
            {THEMES.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                onPress={() => setEditColor(theme.id)}
                style={[
                  styles.colorDot,
                  { backgroundColor: theme.color },
                  editColor === theme.id && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>
        </View>
        <TouchableOpacity
          onPress={handleEditCapital}
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>Save Changes</Text>
        </TouchableOpacity>
      </Modal>

      {/* Edit Fund Modal */}
      <Modal
        isOpen={isEditFundModalOpen}
        onClose={() => setIsEditFundModalOpen(false)}
        title="Edit Fund"
      >
        <Text style={[styles.modalDesc, { color: colors.muted }]}>
          Update the note, quantity or description.
        </Text>

        {renderFundForm(editFundForm, updateEditFundField)}

        <View style={[styles.summary, { borderTopColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              Current Amount:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {settings.currency}
              {selectedFund?.amount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabelBlue]}>New Amount:</Text>
            <Text style={[styles.summaryValueBlue]}>
              {settings.currency}
              {calculateFundTotal(editFundForm).toLocaleString()}
            </Text>
          </View>
        </View>

        {fundError ? <Text style={styles.formError}>{fundError}</Text> : null}

        <TouchableOpacity
          onPress={handleUpdateFund}
          style={[styles.submitBtn, { backgroundColor: buttonColor }]}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>Update Fund</Text>
        </TouchableOpacity>
      </Modal>

      {/* Delete Capital Confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Capital?"
        message={`Are you sure you want to delete "${capital.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteCapital}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Delete Fund Confirmation */}
      <ConfirmModal
        isOpen={isDeleteFundModalOpen}
        title="Delete Fund?"
        message={`Are you sure you want to delete this fund of ${settings.currency}${selectedFund?.amount?.toLocaleString()}? This action cannot be undone.`}
        onConfirm={confirmDeleteFund}
        onCancel={() => setIsDeleteFundModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', flex: 1 },
  balanceCard: { borderRadius: 24, borderWidth: 1, marginBottom: 24, overflow: 'hidden' },
  balanceInner: { padding: 24, alignItems: 'center' },
  balanceLabel: { fontSize: 14, marginBottom: 8 },
  balanceAmount: { fontSize: 48, fontWeight: '700' },
  balanceCurrency: { fontSize: 24, marginRight: 4 },
  addFundsBtn: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addFundsText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fundsSection: { borderRadius: 24, borderWidth: 1, padding: 24, marginBottom: 24 },
  fundsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  fundsTitle: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  fundsDate: { fontSize: 12, marginTop: 2 },
  fundItem: { borderBottomWidth: 1, paddingBottom: 16, marginBottom: 16 },
  fundItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fundItemInfo: { flex: 1 },
  fundTotal: { fontSize: 16, fontWeight: '700' },
  fundDate: { fontSize: 12, marginTop: 2 },
  fundActions: { flexDirection: 'row', gap: 4 },
  fundActionBtn: { padding: 8 },
  fundDetails: { marginLeft: 8 },
  fundDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  fundDetailLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fundDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
  fundDetailType: { fontSize: 14, fontWeight: '500' },
  fundDetailAmount: { fontSize: 12, marginTop: 1 },
  fundDetailDescWrap: {
    marginLeft: 24,
    paddingLeft: 12,
    borderLeftWidth: 2,
    paddingVertical: 4,
  },
  fundDetailDesc: { fontSize: 12, lineHeight: 17 },
  fundDetailDescLabel: { fontWeight: '600' },
  emptyFunds: {
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyFundsText: { fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19 },
  modalDesc: { fontSize: 14, marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 16, borderRadius: 16, fontSize: 16 },
  fundForm: { marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  selectText: { fontSize: 16, fontWeight: '600' },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionChipText: { fontSize: 13, fontWeight: '600' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  quantityDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  quantityDropdownText: { fontSize: 13, fontWeight: '600' },
  quantityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  quantityChip: {
    width: 44,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityChipText: { fontSize: 14, fontWeight: '600' },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  totalBoxLeft: { flex: 1 },
  totalBoxLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  totalBoxEquation: { fontSize: 12, marginTop: 2 },
  totalBoxValue: { fontSize: 22, fontWeight: '700' },
  summary: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  summaryLabelGreen: { fontSize: 14, fontWeight: '600', color: '#10b981' },
  summaryValueGreen: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  summaryLabelBold: { fontSize: 14, fontWeight: '700' },
  summaryValueBold: { fontSize: 18, fontWeight: '700' },
  summaryLabelBlue: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  summaryValueBlue: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: 8 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  colorDot: { width: 40, height: 40, borderRadius: 10, opacity: 0.6 },
  colorDotSelected: {
    opacity: 1,
    borderWidth: 3,
    borderColor: '#3b82f6',
    transform: [{ scale: 1.1 }],
  },
  formError: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  submitBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
