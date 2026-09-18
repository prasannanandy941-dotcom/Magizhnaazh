import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from './theme';

// The live customer website — loaded inside the app so the mobile experience is
// identical to the web, with every feature, always in sync with the site.
const SITE_URL = 'https://event.porulontech.com/customer/';

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
        // Let the in-page <input type="file"> open the gallery/camera so image
        // uploads (gallery, menu photos, reference images) work inside the app.
        allowFileAccess
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        // Razorpay Checkout's standard card/UPI modal is an in-page iframe and
        // unaffected either way, but some sub-flows (UPI intent / bank
        // redirect) can call window.open(). Allow it, and redirect the popup
        // into this same WebView instead of trying to open a real second
        // window (which this screen has no UI for).
        setSupportMultipleWindows
        onOpenWindow={(event: { nativeEvent: { targetUrl?: string } }) => {
          const targetUrl = event.nativeEvent.targetUrl;
          if (targetUrl) ref.current?.injectJavaScript(`window.location.href = ${JSON.stringify(targetUrl)}; true;`);
        }}
        startInLoadingState
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; }}
        renderError={(domain, code, desc) => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to Load Portal</Text>
            <Text style={styles.errorSubtitle}>
              {code === 2 ? 'Connection handshake error. Please tap below to retry.' : desc}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => ref.current?.reload()} activeOpacity={0.85}>
              <Text style={styles.retryText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Floating refresh — reloads the live site (e.g. after a deploy). */}
      <TouchableOpacity style={styles.refreshBtn} onPress={() => ref.current?.reload()} activeOpacity={0.8}>
        <Text style={styles.refreshIcon}>⟳</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  web: { flex: 1, backgroundColor: colors.bg },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#e8c874',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#cf9bb3',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#d4af37',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#1a0a14',
    fontSize: 14,
    fontWeight: '700',
  },
  refreshBtn: {
    position: 'absolute', right: 16, bottom: 28,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(38,16,28,0.92)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.5)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  refreshIcon: { color: '#e8c874', fontSize: 24, fontWeight: '900', marginTop: -2 },
});
