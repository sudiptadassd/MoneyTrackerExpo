import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../components/ThemeWrapper';
import CapitalCard from '../components/CapitalCard';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const themes = [
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

export default function CapitalsScreen({ navigation }) {
  const { colors } = useTheme();
  const { capitals, addCapital, updateCapital, deleteCapital } = useExpenses();
  const { toast } = useFeedback();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCapitalName, setNewCapitalName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCapital, setSelectedCapital] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('blue');

  const handleAddCapital = () => {
    if (!newCapitalName.trim()) return;
    addCapital(newCapitalName, selectedColor);
    setNewCapitalName('');
    setSelectedColor('blue');
    setIsModalOpen(false);
    toast('Capital created successfully!', 'success');
  };

  const handleEditClick = (capital) => {
    setSelectedCapital(capital);
    setEditName(capital.name);
    setEditColor(capital.color);
    setIsEditModalOpen(true);
  };

  const handleEditCapital = () => {
    if (!editName.trim()) return;
    updateCapital(selectedCapital.id, editName, editColor);
    setIsEditModalOpen(false);
    setSelectedCapital(null);
    toast('Capital updated successfully!', 'success');
  };

  const handleDeleteClick = (capital) => {
    setSelectedCapital(capital);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    deleteCapital(selectedCapital.id);
    setIsDeleteModalOpen(false);
    setSelectedCapital(null);
    toast('Capital deleted successfully', 'success');
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
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.heading }]}>Capitals</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Manage your money containers</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsModalOpen(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {capitals.map(capital => (
          <CapitalCard
            key={capital.id}
            capital={capital}
            variant="detailed"
            onPress={() => navigation.navigate('CapitalDetails', { id: capital.id })}
            onEdit={() => handleEditClick(capital)}
            onDelete={() => handleDeleteClick(capital)}
          />
        ))}

        {capitals.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="wallet" size={48} color={colors.muted} style={{ opacity: 0.2 }} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No capitals created yet.</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Tap the + button to add your first container like "Pocket" or "Money Bag".
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Capital">
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>Capital Name</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.input }]}
            placeholder="e.g., Pocket, Money Bag, Bank"
            placeholderTextColor={colors.placeholder}
            value={newCapitalName}
            onChangeText={setNewCapitalName}
            autoFocus
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>Theme Color</Text>
          <View style={styles.colorGrid}>
            {themes.map(theme => (
              <TouchableOpacity
                key={theme.id}
                onPress={() => setSelectedColor(theme.id)}
                style={[
                  styles.colorDot,
                  { backgroundColor: theme.color },
                  selectedColor === theme.id && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>
        </View>
        <TouchableOpacity
          onPress={handleAddCapital}
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>Create Capital</Text>
        </TouchableOpacity>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Capital">
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>Capital Name</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.input }]}
            placeholder="e.g., Pocket, Money Bag, Bank"
            placeholderTextColor={colors.placeholder}
            value={editName}
            onChangeText={setEditName}
            autoFocus
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.label }]}>Theme Color</Text>
          <View style={styles.colorGrid}>
            {themes.map(theme => (
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

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Capital?"
        message={`Are you sure you want to delete "${selectedCapital?.name}"? All transaction history will be preserved.`}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16 },
  emptySub: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 16, borderRadius: 16, fontSize: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  colorDot: { width: 40, height: 40, borderRadius: 10, opacity: 0.6 },
  colorDotSelected: { opacity: 1, borderWidth: 3, borderColor: '#3b82f6', transform: [{ scale: 1.1 }] },
  submitBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
