import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from './theme';

// The live customer website — loaded inside the app so the mobile experience is
// identical to the web, with every feature, always in sync with the site.
const SITE_URL = 'https://event-customer.porulontech.com';

// Present a normal Chrome-on-Android user agent so Google's "disallowed
// user-agent" check doesn't block Sign in with Google inside the WebView.
const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

export function WebApp({ token, user }: { token?: string | null; user?: unknown }) {
  const ref = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [loading, setLoading] = useState(true);

  // Seed the website's own auth storage from our native session, so it opens
  // already logged in (the site reads `accessToken` + `user` from localStorage).
  const injectedBefore = token
    ? `try {
         window.localStorage.setItem('accessToken', ${JSON.stringify(token)});
         window.localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user ?? null))});
       } catch (e) {} true;`
    : 'true;';

  // Android hardware back button navigates the web history instead of exiting.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) {
        ref.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <WebView
        ref={ref}
        source={{ uri: SITE_URL }}
        style={styles.web}
        originWhitelist={['*']}
        userAgent={CHROME_UA}
        injectedJavaScriptBeforeContentLoaded={injectedBefore}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        startInLoadingState
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; }}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  web: { flex: 1, backgroundColor: colors.bg },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
