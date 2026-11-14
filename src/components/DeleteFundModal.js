import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal as RNModal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeWrapper';

/**
 * Lets the user choose what deleting a fund entry should do:
 *  - remove the entry and subtract it from the current balance
 *  - remove only the entry and keep the current balance unchanged
 */
const DeleteFundModal = ({
  isOpen,
  amountLabel,
  onDeleteAndUpdate,
  onRemoveOnly,
  onCancel,
}) => {
  const { colors } = useTheme();

  if (!isOpen) return null;

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View
          style={[
            styles.container,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.input }]}>
            <Ionicons name="trash-outline" size={30} color="#f43f5e" />
          </View>

          <Text style={[styles.title, { color: colors.heading }]}>
            Delete Fund?
          </Text>
          <Text style={[styles.message, { color: colors.muted }]}>
            Choose how to remove {amountLabel} from this capital.
          </Text>

          <TouchableOpacity
            onPress={onDeleteAndUpdate}
            activeOpacity={0.85}
            style={[styles.option, styles.dangerOption]}
          >
            <Ionicons name="trending-down" size={20} color="#ffffff" />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitleLight}>Delete & update balance</Text>
              <Text style={styles.optionSubLight}>
                Remove the entry and subtract it from the current balance.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRemoveOnly}
            activeOpacity={0.85}
            style={[
              styles.option,
              {
                backgroundColor: colors.input,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="remove-circle-outline"
              size={20}
              color={colors.primary}
            />
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                Remove entry only
              </Text>
              <Text style={[styles.optionSub, { color: colors.muted }]}>
                Delete the record but keep the current balance unchanged.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            style={styles.cancelBtn}
          >
            <Text style={[styles.cancelText, { color: colors.muted }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  option: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  dangerOption: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  optionTextWrap: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  optionSub: { fontSize: 12, lineHeight: 17 },
  optionTitleLight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  optionSubLight: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.85)',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 2,
  },
  cancelText: { fontSize: 14, fontWeight: '600' },
});

export default DeleteFundModal;
