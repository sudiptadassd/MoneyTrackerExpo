import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../context/ExpenseContext';

const ThemeToggle = ({ size = 'small' }) => {
  const { settings, setSettings } = useExpenses();
  const isDark = settings.darkMode;

  const toggleSize = size === 'small' ? { width: 48, height: 24 } : { width: 56, height: 28 };
  const thumbSize = size === 'small' ? 18 : 22;

  return (
    <TouchableOpacity
      onPress={() => setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
      style={[
        styles.track,
        toggleSize,
        { backgroundColor: isDark ? '#3b82f6' : '#d1d5db' },
      ]}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            transform: [{ translateX: isDark ? toggleSize.width - thumbSize - 3 : 3 }],
          },
        ]}
      >
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={size === 'small' ? 10 : 14}
          color={isDark ? '#3b82f6' : '#f59e0b'}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default ThemeToggle;
