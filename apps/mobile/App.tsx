import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebApp } from './src/WebApp';

// The app loads the live customer website inside a WebView, so it looks and
// behaves exactly like the web, with every feature. (The hand-built native
// screens still live under src/screens + src/navigation for the native track;
// to switch back, render <RootNavigation/> inside <AuthProvider/> instead.)
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <WebApp />
    </SafeAreaProvider>
  );
}
