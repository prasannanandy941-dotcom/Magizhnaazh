import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

function Gate() {
  const { user, token, loading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const signedIn = !!user && !!token;

  // Close the login overlay once native sign-in succeeds.
  useEffect(() => { if (signedIn) setShowLogin(false); }, [signedIn]);

  // Android back button dismisses the login overlay instead of exiting.
  useEffect(() => {
    if (!showLogin) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogin(false);
      return true;
    });
    return () => sub.remove();
  }, [showLogin]);

  // Wait for the saved session to restore from storage.
  if (loading) return <Loader />;

  // ─── SINGLE STABLE WEBAPP ────────────────────────────────────────────────
  // We NEVER change the key or conditionally render two different <WebApp>
  // instances.  Switching between key="guest" and key="signed-in" destroys and
  // recreates the component, which resets firstLoad=true and causes the 2-3 s
  // loading spinner to reappear on every auth-state change → the blinking loop
  // the user sees.
  //
  // Instead, we always keep one <WebApp> alive and just pass the current token
  // and user.  When those change, WebApp's injectedJavaScriptBeforeContentLoaded
  // gets a new string value, which on Android triggers exactly ONE controlled
  // WebView reload (correct auth state baked in) – and then stops, because
  // after the reload the props are stable so nothing changes again.
  //
  // Calling logout() sets token/user to null. React bails out of subsequent
  // logout() calls with no-op (same null value), so injectedBefore stays
  // stable → no more reloads → no loop.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <WebApp
        token={token}
        user={user}
        onLogout={logout}
        onLoginRequired={() => setShowLogin(true)}
      />

      {showLogin && (
        <View style={StyleSheet.absoluteFill}>
          <FloralBackground />
          <LoginScreen />
          <SafeAreaView edges={['top']} style={styles.closeWrap} pointerEvents="box-none">
            <TouchableOpacity
              onPress={() => setShowLogin(false)}
              style={styles.closeBtn}
              accessibilityLabel="Close sign in"
              activeOpacity={0.8}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  closeWrap: { position: 'absolute', top: 0, right: 0 },
  closeBtn: {
    margin: 12, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(38,16,28,0.92)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#e8c874', fontSize: 18, fontWeight: '800' },
});

function Loader() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f6e3de', alignItems: 'center', justifyContent: 'center' }}>
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
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
