import React, { useContext, useMemo } from 'react';
import { View } from 'react-native';
import { useExpenses } from '../context/ExpenseContext';

const ThemeContext = React.createContext();

export const useTheme = () => useContext(ThemeContext);

const darkColors = {
  background: '#020617',
  foreground: '#f8fafc',
  heading: '#ffffff',
  primary: '#3b82f6',
  primaryFg: '#ffffff',
  success: '#10b981',
  danger: '#ef4444',
  card: '#0f172a',
  cardBorder: '#1e293b',
  surface: '#0f172a',
  navBg: 'rgba(2, 6, 23, 0.8)',
  border: '#1e293b',
  input: '#1e293b',
  muted: '#94a3b8',
  label: '#94a3b8',
  placeholder: '#475569',
};

const lightColors = {
  background: '#f8fafc',
  foreground: '#334155',
  heading: '#1e293b',
  primary: '#3b82f6',
  primaryFg: '#ffffff',
  success: '#10b981',
  danger: '#ef4444',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  surface: '#ffffff',
  navBg: 'rgba(255, 255, 255, 0.8)',
  border: '#e2e8f0',
  input: '#f1f5f9',
  muted: '#64748b',
  label: '#475569',
  placeholder: '#94a3b8',
};

export default function ThemeWrapper({ children }) {
  const { settings } = useExpenses();
  const isDark = !!settings.darkMode;

  const theme = useMemo(
    () => ({
      isDark,
      colors: isDark ? darkColors : lightColors,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={theme}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
