import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
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

const DEFAULT_CURRENCY_TYPES = [
  { id: 'bigNotes', label: 'Big Notes (e.g., 100, 200, 500)', checked: false, step: 100, description: '', amount: '' },
  { id: 'smallNotes', label: 'Small Notes (e.g., 10, 20, 50)', checked: false, step: 10, description: '', amount: '' },
  { id: 'coins', label: 'Coins (e.g., 1, 2, 5)', checked: false, step: 1, description: '', amount: '' },
  { id: 'Others', label: 'Others', checked: false, step: 1, description: '', amount: '' },
];

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
  const [newCurrencyType, setNewCurrencyType] = useState('');
  const [currencyTypes, setCurrencyTypes] = useState(DEFAULT_CURRENCY_TYPES);
  const [editCurrencyTypes, setEditCurrencyTypes] = useState([]);
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

  const calculateTotalToAdd = (types) =>
    types
      .filter((ct) => ct.checked)
      .reduce((sum, ct) => sum + (Number(ct.amount) || 0), 0);

  const buildBreakdown = (types) =>
    types
      .filter((ct) => ct.checked && ct.amount)
      .map(
        (ct) =>
          `${ct.label.split('(')[0].trim()}: ${ct.description || 'N/A'} - ${settings.currency}${ct.amount}`
      )
      .join(', ');

  const handleCurrencyTypeToggle = (typeId) => {
    setCurrencyTypes((prev) =>
      prev.map((ct) => (ct.id === typeId ? { ...ct, checked: !ct.checked } : ct))
    );
  };

  const handleCurrencyFieldChange = (typeId, field, value) => {
    setCurrencyTypes((prev) =>
      prev.map((ct) => (ct.id === typeId ? { ...ct, [field]: value } : ct))
    );
  };

  const handleAddCustomType = () => {
    if (!newCurrencyType.trim()) {
      toast('Please enter a currency type name', 'error');
      return;
    }

    const customId = `custom_${Date.now()}`;
    setCurrencyTypes((prev) => [
      ...prev,
      {
        id: customId,
        label: newCurrencyType.trim(),
        checked: false,
        step: 1,
        description: '',
        amount: '',
        isCustom: true,
      },
    ]);
    setNewCurrencyType('');
    toast('Custom type added!', 'success');
  };

  const handleRemoveCustomType = (typeId) => {
    setCurrencyTypes((prev) => prev.filter((ct) => ct.id !== typeId));
  };

  const handleAddFunds = () => {
    setFundError('');
    const totalAmount = calculateTotalToAdd(currencyTypes);

    if (totalAmount <= 0) {
      setFundError('Please enter at least one amount');
      toast('Please enter at least one amount', 'error');
      return;
    }

    addSource(id, 'Funds Added', buildBreakdown(currencyTypes), totalAmount);

    // Reset form
    setCurrencyTypes(DEFAULT_CURRENCY_TYPES);
    setIsAddFundsModalOpen(false);
    toast('Funds added successfully!', 'success');
  };

  const handleEditFund = (source) => {
    setSelectedFund(source);
    setFundError('');

    const resetTypes = DEFAULT_CURRENCY_TYPES.map((type) => ({ ...type }));

    if (source.breakdown) {
      const parts = source.breakdown.split(', ');
      parts.forEach((part) => {
        const match = part.match(/(.+?):\s*(.+?)\s*-\s*[^\d]*([\d.]+)/);
        if (!match) return;

        const [, type, desc, amt] = match;
        const typeKey = type.trim();

        let foundType = null;
        if (typeKey.toLowerCase().includes('big')) foundType = 'bigNotes';
        else if (typeKey.toLowerCase().includes('small')) foundType = 'smallNotes';
        else if (typeKey.toLowerCase().includes('coin')) foundType = 'coins';
        else if (typeKey.toLowerCase().includes('other')) foundType = 'Others';

        if (foundType) {
          const typeIndex = resetTypes.findIndex((t) => t.id === foundType);
          if (typeIndex !== -1) {
            resetTypes[typeIndex] = {
              ...resetTypes[typeIndex],
              checked: true,
              description: desc.trim() !== 'N/A' ? desc.trim() : '',
              amount: amt.trim(),
            };
          }
        } else {
          // Custom type
          resetTypes.push({
            id: `custom_${Date.now()}_${Math.random()}`,
            label: typeKey,
            checked: true,
            step: 1,
            description: desc.trim() !== 'N/A' ? desc.trim() : '',
            amount: amt.trim(),
            isCustom: true,
          });
        }
      });
    }

    setEditCurrencyTypes(resetTypes);
    setIsEditFundModalOpen(true);
  };

  const handleUpdateFund = () => {
    setFundError('');
    const totalAmount = calculateTotalToAdd(editCurrencyTypes);

    if (totalAmount <= 0) {
      setFundError('Please enter at least one amount');
      toast('Please enter at least one amount', 'error');
      return;
    }

    updateSource(selectedFund.id, 'Funds Added', buildBreakdown(editCurrencyTypes), totalAmount);

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

  const renderCurrencyTypes = (types, onToggle, onChange, onRemoveCustom) => (
    <View style={styles.formGroup}>
      {types.map((ct) => (
        <View key={ct.id} style={styles.typeBlock}>
          <View style={styles.checkboxRow}>
            <Switch
              value={ct.checked}
              onValueChange={() => onToggle(ct.id)}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={ct.checked ? colors.primary : '#f4f3f4'}
            />
            <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>
              {ct.label}
            </Text>
            {ct.isCustom && onRemoveCustom && (
              <TouchableOpacity
                onPress={() => onRemoveCustom(ct.id)}
                style={styles.removeTypeBtn}
              >
                <Ionicons name="close" size={16} color="#f43f5e" />
              </TouchableOpacity>
            )}
          </View>

          {ct.checked && (
            <View style={styles.fieldsRow}>
              <TextInput
                style={[
                  styles.fieldInput,
                  { flex: 2, color: colors.foreground, backgroundColor: colors.input },
                ]}
                placeholder="Description"
                placeholderTextColor={colors.placeholder}
                value={ct.description}
                onChangeText={(text) => onChange(ct.id, 'description', text)}
              />
              <TextInput
                style={[
                  styles.fieldInput,
                  { flex: 1, color: colors.foreground, backgroundColor: colors.input },
                ]}
                placeholder="Amount"
                placeholderTextColor={colors.placeholder}
                value={ct.amount}
                onChangeText={(text) => onChange(ct.id, 'amount', text)}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>
      ))}
    </View>
  );

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
                                    {item.type}:
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
          Select currency types and enter details.
        </Text>

        {renderCurrencyTypes(
          currencyTypes,
          handleCurrencyTypeToggle,
          handleCurrencyFieldChange,
          handleRemoveCustomType
        )}

        {/* Add Custom Type */}
        <View style={[styles.customTypeSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.label }]}>
            Add Custom Currency Type
          </Text>
          <View style={styles.customTypeRow}>
            <TextInput
              style={[
                styles.customInput,
                { color: colors.foreground, backgroundColor: colors.input },
              ]}
              placeholder="e.g., Gift Cards, Mobile Money"
              placeholderTextColor={colors.placeholder}
              value={newCurrencyType}
              onChangeText={setNewCurrencyType}
            />
            <TouchableOpacity
              onPress={handleAddCustomType}
              style={[styles.customBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

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
              {calculateTotalToAdd(currencyTypes).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.divider, { borderTopColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabelBold, { color: colors.foreground }]}>
              After Balance:
            </Text>
            <Text style={[styles.summaryValueBold, { color: colors.heading }]}>
              {settings.currency}
              {(balance + calculateTotalToAdd(currencyTypes)).toLocaleString()}
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
          Update currency types and amounts.
        </Text>

        {renderCurrencyTypes(
          editCurrencyTypes,
          (typeId) =>
            setEditCurrencyTypes((prev) =>
              prev.map((ct) =>
                ct.id === typeId ? { ...ct, checked: !ct.checked } : ct
              )
            ),
          (typeId, field, value) =>
            setEditCurrencyTypes((prev) =>
              prev.map((ct) => (ct.id === typeId ? { ...ct, [field]: value } : ct))
            )
        )}

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
              {calculateTotalToAdd(editCurrencyTypes).toLocaleString()}
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
  typeBlock: { marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  checkboxLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  removeTypeBtn: { padding: 4 },
  fieldsRow: { flexDirection: 'row', gap: 12, marginLeft: 56, marginBottom: 12 },
  fieldInput: { padding: 12, borderRadius: 12, fontSize: 14 },
  customTypeSection: { borderTopWidth: 1, paddingTop: 16, marginBottom: 8 },
  customTypeRow: { flexDirection: 'row', gap: 8 },
  customInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 14 },
  customBtn: { paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
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
