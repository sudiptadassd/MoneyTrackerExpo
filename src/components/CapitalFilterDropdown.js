import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeWrapper';

export default function CapitalFilterDropdown({ capitals, selectedCapital, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();

  const getSelectedLabel = () => {
    if (selectedCapital === 'all') return 'All Sources';
    const cap = capitals.find(c => c.id === selectedCapital);
    return cap ? cap.name : 'Unknown';
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.input }]}
      >
        <Text style={[styles.triggerText, { color: colors.foreground }]}>{getSelectedLabel()}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </TouchableOpacity>

      <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FlatList
              data={[{ id: 'all', name: 'All Sources' }, ...capitals]}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedCapital === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => { onSelect(item.id); setIsOpen(false); }}
                    style={[styles.option, isSelected && { backgroundColor: colors.input }]}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? colors.primary : colors.foreground }]}>
                      {item.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dropdown: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 300,
    padding: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
