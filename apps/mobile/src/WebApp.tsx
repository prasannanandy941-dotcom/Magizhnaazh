import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, BackHandler, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './theme';
import { STATIC_I18N_SCRIPT } from './staticI18nScript';

// The live customer website — loaded inside the app so the mobile experience is
// identical to the web, with every feature, always in sync with the site.
const SITE_URL = 'https://event.porulontech.com/customer/';
const NATIVE_LANG_KEY = 'magizhnaazh_lang';
const STATIC_PAGE_RE = /\/(about|careers|blog|press|help|returns|privacy|terms)\.html(\?|$|#)/i;

// Present a normal Chrome-on-Android user agent so Google's "disallowed
// user-agent" check doesn't block Sign in with Google inside the WebView.
// The site's own page colour (light theme). The WebView and the area around it
// use the same colour so nothing dark shows through before the page paints.
const PAGE_BG = '#f6e3de';

const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

export function WebApp({ token, user, onLoginRequired, onLogout }: {
  token?: string | null;
  user?: unknown;
  // The site asks the app to sign in / out (see postToNativeApp in customer-web).
  onLoginRequired?: () => void;
  onLogout?: () => void;
}) {
  const ref = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const langRef = useRef<string | null>(null);
  const [savedLang, setSavedLang] = useState<string | null>(null);
  // Only the FIRST load is covered by the spinner. Toggling it on every
  // navigation/redirect made the whole screen blink while the site was working.
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NATIVE_LANG_KEY)
      .then((code) => {
        if (code) {
          langRef.current = code;
          setSavedLang(code);
        }
      })
      .catch(() => {});
  }, []);

  // Seed the website's own auth storage from our native session, so it opens
  // already logged in (the site reads `accessToken` + `user` from localStorage).
  // Without a session it opens as a guest (any stale web session cleared), and
  // __MAGIZH_NATIVE_AUTH tells the site to send sign-in requests back to us.
  const injectedBefore = `try {
       window.__MAGIZH_NATIVE_AUTH = true;
       ${savedLang ? `if (!window.localStorage.getItem('magizhnaazh_lang')) { window.localStorage.setItem('magizhnaazh_lang', ${JSON.stringify(savedLang)}); }` : ''}
       if (!window.localStorage.getItem('magizhnaazh_theme_choice_customer')) {
         window.localStorage.setItem('magizhnaazh_theme_choice_customer', 'light');
         window.localStorage.setItem('magizhnaazh_theme', 'light');
       }
       document.documentElement.setAttribute('data-theme', window.localStorage.getItem('magizhnaazh_theme_choice_customer') || 'light');
       ${token
         ? `window.localStorage.setItem('accessToken', ${JSON.stringify(token)});
            window.localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user ?? null))});`
         : `window.localStorage.removeItem('accessToken');
            window.localStorage.removeItem('user');`}
     } catch (e) {} true;`;

  const applyStaticI18nIfNeeded = (url?: string) => {
    if (url && !STATIC_PAGE_RE.test(url)) return;
    const code = langRef.current;
    ref.current?.injectJavaScript(
      `try {
        ${code ? `if (!window.localStorage.getItem('magizhnaazh_lang')) window.localStorage.setItem('magizhnaazh_lang', ${JSON.stringify(code)});` : ''}
        if (/(about|careers|blog|press|help|returns|privacy|terms)\\.html/i.test(window.location.pathname)) {
          ${STATIC_I18N_SCRIPT}
          if (typeof window.__MAGIZH_APPLY_STATIC_LANG === 'function') {
            window.__MAGIZH_APPLY_STATIC_LANG(${code ? JSON.stringify(code) : 'undefined'});
          }
        }
      } catch (e) {} true;`
    );
  };

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === 'login-required') onLoginRequired?.();
      else if (msg?.type === 'logout') onLogout?.();
      else if (msg?.type === 'language' && typeof msg.code === 'string') {
        langRef.current = msg.code;
        setSavedLang(msg.code);
        AsyncStorage.setItem(NATIVE_LANG_KEY, msg.code).catch(() => {});
      }
    } catch {
      /* not one of our messages */
    }
  };

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

  // A WebView can only ever navigate to real web pages (http/https, plus a
  // couple of internal schemes) — it has no idea what to do with a UPI app
  // deep link like upi://pay?..., phonepe://..., tez://..., paytmmp://..., or
  // an Android intent:// URL, and blows up with net::ERR_UNKNOWN_URL_SCHEME
  // if asked to load one directly. Those need to be handed off to the OS
  // (which either opens the matching app or shows its own "no app found"),
  // never loaded as a page inside this WebView.
  const isWebLoadableUrl = (url: string) =>
    /^(https?:|about:|data:|blob:)/i.test(url);

  const openExternally = (url: string) => {
    Linking.openURL(url).catch(() => {
      // No app installed to handle this scheme, or the OS declined — nothing
      // more we can do; the WebView itself is left untouched either way.
    });
  };

  const withLangParam = (targetUrl: string) => {
    const code = langRef.current;
    if (!code || code === 'en' || !STATIC_PAGE_RE.test(targetUrl)) return targetUrl;
    try {
      const u = new URL(targetUrl);
      if (!u.searchParams.get('lang')) u.searchParams.set('lang', code);
      return u.toString();
    } catch {
      return targetUrl;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <WebView
        ref={ref}
        source={{ uri: SITE_URL }}
        style={styles.web}
        originWhitelist={['*']}
        userAgent={CHROME_UA}
        injectedJavaScriptBeforeContentLoaded={injectedBefore}
        onMessage={onMessage}
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
        // redirect) can call window.open(). Allow it: a real web URL loads
        // into this same WebView (which has no UI for a real second window
        // anyway); a UPI app deep link goes to the OS instead.
        // Keep Razorpay Checkout inside this WebView. On Android, enabling
        // multiple windows can send the checkout popup to onOpenWindow with
        // an empty target and make the payment screen appear to fall back.
        setSupportMultipleWindows={false}
        onOpenWindow={(event: { nativeEvent: { targetUrl?: string } }) => {
          const rawUrl = event.nativeEvent.targetUrl;
          if (!rawUrl) return;
          if (isWebLoadableUrl(rawUrl)) {
            const targetUrl = withLangParam(rawUrl);
            ref.current?.injectJavaScript(`window.location.href = ${JSON.stringify(targetUrl)}; true;`);
          } else {
            openExternally(rawUrl);
          }
        }}
        // Covers the more common case for UPI intent apps (PhonePe, Google
        // Pay, Paytm, etc.): checkout navigating straight to the deep link
        // (window.location.href = 'phonepe://...') rather than via
        // window.open(). Intercept before the WebView attempts to load it.
        onShouldStartLoadWithRequest={(request) => {
          if (isWebLoadableUrl(request.url)) return true;
          openExternally(request.url);
          return false;
        }}
        onLoadEnd={(e) => {
          setFirstLoad(false);
          applyStaticI18nIfNeeded(e.nativeEvent.url);
        }}
        onNavigationStateChange={(s) => {
          canGoBack.current = s.canGoBack;
          applyStaticI18nIfNeeded(s.url);
        }}
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
      {firstLoad && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* The rising flower/bokeh backdrop is drawn by the site itself. A second,
          natively animated copy layered over the WebView made the page beneath
          it re-composite and flash on Android, so it is not rendered here. */}

      {/* Floating refresh — reloads the live site (e.g. after a deploy). */}
      <TouchableOpacity style={styles.refreshBtn} onPress={() => ref.current?.reload()} activeOpacity={0.8}>
        <Text style={styles.refreshIcon}>⟳</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  web: { flex: 1, backgroundColor: PAGE_BG },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: PAGE_BG },
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
