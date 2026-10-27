import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpenseProvider } from './src/context/ExpenseContext';
import { FeedbackProvider } from './src/context/FeedbackContext';
import ThemeWrapper, { useTheme } from './src/components/ThemeWrapper';

import DashboardScreen from './src/screens/DashboardScreen';
import CapitalsScreen from './src/screens/CapitalsScreen';
import CapitalDetailsScreen from './src/screens/CapitalDetailsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import MoreScreen from './src/screens/MoreScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CapitalsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CapitalsList" component={CapitalsScreen} />
      <Stack.Screen name="CapitalDetails" component={CapitalDetailsScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      notification: colors.danger,
    },
  };

  const icons = {
    Dashboard: { active: 'home', inactive: 'home-outline' },
    Capitals: { active: 'wallet', inactive: 'wallet-outline' },
    Transactions: { active: 'list', inactive: 'list-outline' },
    Expenses: { active: 'trending-down', inactive: 'trending-down-outline' },
    More: { active: 'person', inactive: 'person-outline' },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            const icon = icons[route.name] || icons.Dashboard;
            return (
              <Ionicons
                name={focused ? icon.active : icon.inactive}
                size={size}
                color={color}
              />
            );
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingTop: 8,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ tabBarLabel: 'Dashboard' }}
        />
        <Tab.Screen
          name="Capitals"
          component={CapitalsStack}
          options={{ tabBarLabel: 'Capitals' }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{ tabBarLabel: 'History' }}
        />
        <Tab.Screen
          name="Expenses"
          component={ExpensesScreen}
          options={{ tabBarLabel: 'Spends' }}
        />
        <Tab.Screen
          name="More"
          component={MoreScreen}
          options={{ tabBarLabel: 'More' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ExpenseProvider>
        <ThemeWrapper>
          <FeedbackProvider>
            <MainTabs />
          </FeedbackProvider>
        </ThemeWrapper>
      </ExpenseProvider>
    </SafeAreaProvider>
  );
}
