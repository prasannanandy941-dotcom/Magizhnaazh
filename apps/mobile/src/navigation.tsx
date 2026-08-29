import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from './auth';
import { FloralBackground } from './components/FloralBackground';
import type { RootStackParamList, AppTabParamList } from './navTypes';
import LoginScreen from './screens/LoginScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import VendorDetailScreen from './screens/VendorDetailScreen';
import EventsScreen from './screens/EventsScreen';
import BookingsScreen from './screens/BookingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import { colors, fonts } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const header = {
  headerStyle: { backgroundColor: colors.headerBg },
  headerTintColor: colors.headerText,
  headerTitleStyle: { fontFamily: fonts.displayBlack },
};

// Transparent so the FloralBackground shows through behind every screen.
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...header,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: 'Explore', tabBarIcon: tabIcon('🔍') }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: 'Events', tabBarIcon: tabIcon('📅') }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Bookings', tabBarIcon: tabIcon('🧾') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

export function RootNavigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FloralBackground />
      <NavigationContainer theme={navTheme}>
        {user ? (
          <Stack.Navigator screenOptions={{ ...header, contentStyle: { backgroundColor: 'transparent' } }}>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="VendorDetail"
              component={VendorDetailScreen}
              options={({ route }) => ({ title: route.params.vendorName || 'Vendor' })}
            />
          </Stack.Navigator>
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </View>
  );
}
