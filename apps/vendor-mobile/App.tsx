import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { AuthProvider, useAuth } from './src/auth';
import LoginScreen from './src/screens/LoginScreen';
import { FloralBackground } from './src/components/FloralBackground';
import { WebApp } from './src/WebApp';
import { colors } from './src/theme';

// Hybrid: sign in NATIVELY (email or Google — Google works natively, unlike in a
// WebView), then open the real vendor portal already logged in by seeding its
// localStorage session. Best of both: native Google + the full vendor web app.
function Gate() {
  const { user, token, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user || !token) {
    return (
      <View style={{ flex: 1 }}>
        <FloralBackground />
        <LoginScreen />
      </View>
    );
  }
  return <WebApp token={token} user={user} />;
}

function Loader() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
  });

  if (!fontsLoaded) return <Loader />;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
