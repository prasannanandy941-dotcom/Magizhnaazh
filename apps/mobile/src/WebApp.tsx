import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, BackHandler, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './theme';

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

const NATIVE_HEADER_CSS = `
  html[data-native-app="true"] .customer-desktop-navigation { display: none !important; }
  html[data-native-app="true"] .customer-mobile-menu-toggle { display: none !important; }
  html[data-native-app="true"] .customer-bottom-nav { display: block !important; }
  html[data-native-app="true"] .customer-header-wishlist { display: none !important; }
  html[data-native-app="true"] .customer-header-sign-in { display: none !important; }
  html[data-native-app="true"] .customer-header-user-menu { display: none !important; }
  html[data-native-app="true"] .customer-header-create-event { display: none !important; }
  html[data-native-app="true"] .customer-header-brand-copy { display: flex !important; flex-direction: column !important; justify-content: center !important; }
  html[data-native-app="true"] .customer-header-brand-copy .customer-header-subtitle { display: block !important; }
  @media (max-width: 767px) {
    html[data-native-app="true"] .customer-header-row {
      width: 100% !important;
      box-sizing: border-box !important;
      padding-left: 14px !important;
      padding-right: 14px !important;
      gap: 8px !important;
    }
    html[data-native-app="true"] .customer-header-brand-copy span.font-display {
      font-size: 1.25rem !important;
      font-weight: 800 !important;
    }
    html[data-native-app="true"] .customer-header-brand-copy .customer-header-subtitle {
      font-size: 0.52rem !important;
      letter-spacing: 0.1em !important;
      margin-top: 3px !important;
    }
    html[data-native-app="true"] .customer-header-actions {
      gap: 8px !important;
      display: flex !important;
      align-items: center !important;
    }
    html[data-native-app="true"] .customer-mobile-language-button {
      width: 38px !important;
      height: 38px !important;
      padding: 0 !important;
      flex: 0 0 38px !important;
      border-radius: 12px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    html[data-native-app="true"] .customer-mobile-language-button span { display: none !important; }
    html[data-native-app="true"] .customer-header-theme-toggle {
      width: 38px !important;
      height: 38px !important;
      padding: 0 !important;
      flex: 0 0 38px !important;
      border-radius: 12px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    html[data-native-app="true"] .customer-header-wishlist,
    html[data-native-app="true"] .customer-header-sign-in,
    html[data-native-app="true"] .customer-header-user-menu,
    html[data-native-app="true"] .customer-mobile-menu-toggle {
      display: none !important;
    }
  }
`;

const STATIC_HEADER_RESPONSIVE_CSS = `
  .header { position: sticky !important; top: 0 !important; z-index: 100 !important; background: rgba(26, 10, 20, 0.98) !important; backdrop-filter: blur(12px) !important; border-bottom: 1px solid rgba(107, 33, 64, 0.6) !important; box-sizing: border-box !important; width: 100% !important; }
  .header-inner { max-width: 960px !important; margin: 0 auto !important; padding: 12px 20px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important; box-sizing: border-box !important; flex-wrap: nowrap !important; }
  #static-i18n-switcher { display: flex !important; align-items: center !important; gap: 6px !important; position: relative !important; flex-shrink: 0 !important; flex-wrap: nowrap !important; justify-content: flex-end !important; }
  .back-btn { display: inline-flex !important; align-items: center !important; gap: 4px !important; white-space: nowrap !important; flex-shrink: 1 !important; box-sizing: border-box !important; overflow: hidden !important; text-decoration: none !important; }
  .back-btn-text { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
  .card { box-sizing: border-box !important; max-width: 100% !important; overflow-wrap: break-word !important; }
  .company-details { box-sizing: border-box !important; max-width: 100% !important; overflow: hidden !important; }
  .company-name { overflow-wrap: break-word !important; word-break: break-word !important; }
  .detail-item { display: flex !important; align-items: flex-start !important; flex-wrap: wrap !important; overflow-wrap: anywhere !important; word-break: break-word !important; max-width: 100% !important; }
  .detail-item a, .contact-card a, a[href^="mailto:"], a[href^="http"], a[href^="tel:"] { overflow-wrap: anywhere !important; word-break: break-all !important; max-width: 100% !important; }
  @media (max-width: 640px) {
    .header-inner { padding: 10px 12px !important; gap: 6px !important; flex-wrap: nowrap !important; }
    .logo-group { gap: 8px !important; flex-shrink: 0 !important; min-width: 0 !important; }
    .logo-badge { width: 32px !important; height: 32px !important; font-size: 16px !important; border-radius: 10px !important; }
    .logo-text { font-size: 16px !important; white-space: nowrap !important; }
    #static-i18n-switcher { gap: 6px !important; flex-wrap: nowrap !important; }
    .back-btn { padding: 6px 10px !important; font-size: 12px !important; white-space: nowrap !important; max-width: 125px !important; line-height: 1.2 !important; border-radius: 8px !important; }
    #static-i18n-switcher > button { padding: 6px 10px !important; font-size: 12px !important; white-space: nowrap !important; border-radius: 8px !important; }
    .wrap { padding: 24px 16px 60px !important; }
    .card { padding: 22px 16px !important; border-radius: 16px !important; }
    .company-details { padding: 16px 14px !important; border-radius: 14px !important; }
    .company-name { font-size: 15px !important; }
    .detail-item { font-size: 13px !important; gap: 6px !important; }
  }
  @media (max-width: 380px) {
    .header-inner { padding: 8px 8px !important; gap: 4px !important; }
    .logo-group { gap: 6px !important; }
    .logo-badge { width: 28px !important; height: 28px !important; font-size: 14px !important; border-radius: 8px !important; }
    .logo-text { font-size: 14px !important; }
    .back-btn { max-width: 90px !important; padding: 5px 6px !important; font-size: 11px !important; }
    #static-i18n-switcher > button { padding: 5px 6px !important; font-size: 11px !important; }
    .wrap { padding: 18px 12px 48px !important; }
    .card { padding: 16px 12px !important; }
    .company-details { padding: 14px 10px !important; }
    .company-name { font-size: 14px !important; }
    .detail-item { font-size: 12px !important; gap: 4px !important; }
  }
  @media (max-width: 340px) {
    .logo-text { font-size: 13px !important; }
    .back-btn { max-width: 75px !important; padding: 4px 6px !important; font-size: 10px !important; }
    #static-i18n-switcher > button { padding: 4px 6px !important; font-size: 10px !important; }
  }
`;

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
  // pageLoading tracks whether the WebView is currently loading a page.
  // We use onLoadStart/onLoadEnd (not a one-shot mount flag) so the overlay
  // also covers auth-triggered reloads (when injectedBefore changes), not just
  // the very first load. This prevents the blank white flash between reloads.
  const [pageLoading, setPageLoading] = useState(true);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armSafetyTimer = () => {
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    // 8 s max – generous for slow mobile connections, but prevents permanent spinner.
    safetyTimer.current = setTimeout(() => setPageLoading(false), 8000);
  };

  useEffect(() => {
    armSafetyTimer();
    return () => { if (safetyTimer.current) clearTimeout(safetyTimer.current); };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(NATIVE_LANG_KEY)
      .then((code) => {
        if (code) {
          langRef.current = code;
          // Seed the webview localStorage without mutating props or reloading
          ref.current?.injectJavaScript(
            `try {
              if (!window.localStorage.getItem('magizhnaazh_lang_customer')) {
                window.localStorage.setItem('magizhnaazh_lang_customer', ${JSON.stringify(code)});
              }
            } catch (e) {} true;`
          );
        }
      })
      .catch(() => {});
  }, []);

  // Seed the website's own auth storage from our native session, so it opens
  // already logged in (the site reads `accessToken` + `user` from localStorage).
  // Without a session it opens as a guest (any stale web session cleared), and
  // __MAGIZH_NATIVE_AUTH tells the site to send sign-in requests back to us.
  // CRITICAL: injectedBefore must remain reference-equal across renders so
  // Android WebView does NOT reload the page and cause an infinite buffering loop.
  const injectedBefore = useMemo(
    () => `try {
       window.__MAGIZH_NATIVE_AUTH = true;
       if (document.documentElement) document.documentElement.setAttribute('data-native-app', 'true');
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
     } catch (e) {} true;`,
    [token, user]
  );

  // Signing in (or out) natively AFTER the page is already open must update the
  // page too. Android WebView does not re-run `injectedBefore` for a page that is
  // already loaded, so without this the site kept showing the guest view until the
  // app was closed and reopened. Write the session into the page's own storage,
  // then reload so it boots signed in (or signed out).
  const appliedToken = useRef<string | null>(token ?? null);
  useEffect(() => {
    const next = token ?? null;
    if (appliedToken.current === next) return;
    appliedToken.current = next;
    setPageLoading(true);
    armSafetyTimer();
    ref.current?.injectJavaScript(
      `try {
         ${next
           ? `window.localStorage.setItem('accessToken', ${JSON.stringify(next)});
              window.localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user ?? null))});`
           : `window.localStorage.removeItem('accessToken');
              window.localStorage.removeItem('user');`}
       } catch (e) {}
       window.location.reload();
       true;`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const applyStaticI18nIfNeeded = (url?: string) => {
    // Only apply on actual static pages (about.html, careers.html, etc.), NEVER on customer marketplace SPA
    if (!url || !STATIC_PAGE_RE.test(url)) return;
    const code = langRef.current;
    ref.current?.injectJavaScript(
      `try {
        var s = document.getElementById('static-header-responsive-style');
        if (!s) {
          s = document.createElement('style');
          s.id = 'static-header-responsive-style';
          s.textContent = ${JSON.stringify(STATIC_HEADER_RESPONSIVE_CSS)};
          (document.head || document.documentElement).appendChild(s);
        }
        ${code ? `if (!window.localStorage.getItem('magizhnaazh_lang_customer')) window.localStorage.setItem('magizhnaazh_lang_customer', ${JSON.stringify(code)});` : ''}
        if (typeof window.__MAGIZH_APPLY_STATIC_LANG === 'function') {
          window.__MAGIZH_APPLY_STATIC_LANG(${code ? JSON.stringify(code) : 'undefined'});
        }
      } catch (e) {} true;`
    );
  };

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === 'login-required') onLoginRequired?.();
      else if (msg?.type === 'logout') onLogout?.();
      else if (msg?.type === 'reload') {
        setPageLoading(true);
        armSafetyTimer();
        ref.current?.reload();
      }
      else if (msg?.type === 'language' && typeof msg.code === 'string') {
        langRef.current = msg.code;
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
        pullToRefreshEnabled
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
        onLoadStart={() => {
          // Show spinner for every load (initial + auth-triggered reloads).
          setPageLoading(true);
          armSafetyTimer();
        }}
        onLoadEnd={(e) => {
          if (safetyTimer.current) clearTimeout(safetyTimer.current);
          setPageLoading(false);
          ref.current?.injectJavaScript(
            `try {
              var root = document.documentElement;
              if (root) {
                root.setAttribute('data-native-app', 'true');
                var nativeHeaderStyle = document.getElementById('magizh-native-header-layout');
                if (!nativeHeaderStyle) {
                  nativeHeaderStyle = document.createElement('style');
                  nativeHeaderStyle.id = 'magizh-native-header-layout';
                  nativeHeaderStyle.textContent = ${JSON.stringify(NATIVE_HEADER_CSS)};
                  (document.head || root).appendChild(nativeHeaderStyle);
                }
              }
            } catch (e) { console.error('Unable to apply native header layout', e); }
            true;`
          );
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
      {pageLoading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* The rising flower/bokeh backdrop is drawn by the site itself. A second,
          natively animated copy layered over the WebView made the page beneath
          it re-composite and flash on Android, so it is not rendered here. */}

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
});
