import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeWrapper';

const Toast = ({ message, type = 'info', onClose }) => {
  const { colors, isDark } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
      ]).start(() => onClose && onClose());
    }, 2700);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icons = {
    success: { name: 'checkmark-circle', color: '#10b981' },
    error: { name: 'alert-circle', color: '#ef4444' },
    info: { name: 'information-circle', color: '#3b82f6' },
  };

  const icon = icons[type] || icons.info;

  const lightBg = {
    success: '#ecfdf5',
    error: '#fef2f2',
    info: '#eff6ff',
  };

  const darkBg = {
    success: 'rgba(16, 185, 129, 0.15)',
    error: 'rgba(239, 68, 68, 0.15)',
    info: 'rgba(59, 130, 246, 0.15)',
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: isDark ? darkBg[type] || darkBg.info : lightBg[type] || lightBg.info,
          borderColor: icon.color + '40',
        },
      ]}
    >
      <Ionicons name={icon.name} size={20} color={icon.color} />
      <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="close" size={16} color={colors.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
    width: '100%',
    maxWidth: 400,
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

export default Toast;
