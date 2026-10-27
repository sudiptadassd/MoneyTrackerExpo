import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeWrapper';

export default function SortDropdown({ currentSort, onSortChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();

  const sortOptions = [
    { label: 'Newest', value: 'NEWEST' },
    { label: 'Oldest', value: 'OLDEST' },
    { label: 'High Amount', value: 'AMOUNT_HIGH' },
    { label: 'Low Amount', value: 'AMOUNT_LOW' },
  ];

  const getSelectedLabel = () => {
    const option = sortOptions.find(o => o.value === currentSort);
    return option ? option.label : 'Sort';
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.input }]}
      >
        <Ionicons name="funnel" size={14} color={colors.muted} />
        <Text style={[styles.triggerText, { color: colors.foreground }]}>{getSelectedLabel()}</Text>
      </TouchableOpacity>

      <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FlatList
              data={sortOptions}
              keyExtractor={item => item.value}
              renderItem={({ item }) => {
                const isSelected = currentSort === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => { onSortChange(item.value); setIsOpen(false); }}
                    style={[styles.option, isSelected && { backgroundColor: colors.input }]}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? colors.primary : colors.foreground }]}>
                      {item.label}
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
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
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
