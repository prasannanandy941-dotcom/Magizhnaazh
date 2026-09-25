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

// Hybrid: customers browse the real website as a guest straight away. When the
// site needs a login (booking, events, orders…) it asks the app, which shows the
// NATIVE sign-in (email or Google — Google works natively, unlike in a WebView),
// then reopens the site already logged in by seeding its localStorage session.
function Gate() {
  const { user, token, loading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const signedIn = !!user && !!token;

  // Close the sign-in screen once the login succeeds.
  useEffect(() => { if (signedIn) setShowLogin(false); }, [signedIn]);

  // Android back button closes the sign-in screen instead of the web page.
  useEffect(() => {
    if (!showLogin) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowLogin(false);
      return true;
    });
    return () => sub.remove();
  }, [showLogin]);

  if (loading) return <Loader />;
  if (signedIn) {
    // The site asking for a login while signed in means the session expired:
    // drop it and show the sign-in screen again.
    return (
      <WebApp
        key="signed-in"
        token={token}
        user={user}
        onLogout={logout}
        onLoginRequired={() => { setShowLogin(true); logout(); }}
      />
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <WebApp key="guest" onLoginRequired={() => setShowLogin(true)} />
      {showLogin && (
        <View style={StyleSheet.absoluteFill}>
          <FloralBackground />
          <LoginScreen />
          <SafeAreaView edges={['top']} style={styles.closeWrap} pointerEvents="box-none">
            <TouchableOpacity onPress={() => setShowLogin(false)} style={styles.closeBtn} accessibilityLabel="Close sign in" activeOpacity={0.8}>
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
