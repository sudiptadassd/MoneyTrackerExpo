import React from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeWrapper';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { colors } = useTheme();

  if (!isOpen) return null;

  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.input }]}>
            <Ionicons name="help-circle" size={32} color="#f59e0b" />
          </View>
          <Text style={[styles.title, { color: colors.heading }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.input }]}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.btn, styles.confirmBtn]}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
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
    padding: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    width: '100%',
    maxWidth: 320,
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
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelBtn: {},
  confirmBtn: {
    backgroundColor: '#e11d48',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  confirmText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
});

export default ConfirmModal;
