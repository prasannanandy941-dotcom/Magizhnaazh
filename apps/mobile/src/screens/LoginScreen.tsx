import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import {
  GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../auth';
import * as api from '../api';
import { colors, radius, space } from '../theme';
import { GOOGLE_WEB_CLIENT_ID } from '../config';

export default function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);

  // Native Google Sign-In: `webClientId` makes Google mint an ID token whose
  // audience is our web client id — exactly what the backend verifies against.
  useEffect(() => {
    try {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    } catch {
      /* native module missing (running an old build) — button errors on tap */
    }
  }, []);

  const onGoogle = async () => {
    setGoogleBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return; // cancelled
      const idToken = res.data?.idToken;
      if (!idToken) throw new Error('No ID token returned from Google.');
      await loginWithGoogle(idToken);
    } catch (e: any) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        /* user cancelled — ignore */
      } else {
        Alert.alert('Google sign-in failed', e?.message || 'Please try again.');
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email.trim(), password);
      } else {
        if (!otp) throw new Error('Enter the OTP sent to your email.');
        await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, otp: otp.trim() });
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    if (!email.trim()) { setError('Enter your email first.'); return; }
    setError('');
    setNotice('');
    setOtpSending(true);
    try {
      const res = await api.sendOtp(email.trim());
      setNotice(res._devOtp ? `Use this code: ${res._devOtp}` : (res.message || 'OTP sent to your email.'));
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>Magizhnaazh</Text>
          <Text style={styles.brandSub}>Smart Event Planning</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => { setMode('signin'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => { setMode('signup'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <>
              <Field label="Full Name" value={name} onChangeText={setName} placeholder="Felix Kumar" />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {mode === 'signup' && (
              <TouchableOpacity style={styles.otpBtn} onPress={requestOtp} disabled={otpSending}>
                {otpSending ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.otpBtnText}>Send OTP</Text>}
              </TouchableOpacity>
            )}
          </View>
          {!!notice && <Text style={styles.notice}>{notice}</Text>}

          {mode === 'signup' && (
            <Field label="Verification Code (OTP)" value={otp} onChangeText={setOtp} placeholder="6-digit code" keyboardType="number-pad" />
          )}
          {mode === 'signup' && (
            <Field label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+91 98400 11223" keyboardType="phone-pad" />
          )}

          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.submit} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={styles.submitText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>}
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} /><Text style={styles.orText}>OR</Text><View style={styles.orLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={onGoogle} disabled={googleBusy}>
            {googleBusy ? <ActivityIndicator color={colors.text} /> : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.demo}>Demo: customer@magizhnaazh.com / Passw0rd!</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
}) {
  return (
    <>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.secureTextEntry || props.keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg, backgroundColor: 'transparent' },
  brand: { alignItems: 'center', marginBottom: space.xl },
  brandTitle: { fontSize: 30, fontWeight: '800', color: colors.primary },
  brandSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, marginBottom: space.lg },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontWeight: '700', color: colors.textMuted, fontSize: 13 },
  tabTextActive: { color: colors.onPrimary },
  label: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'stretch' },
  input: {
    borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },
  otpBtn: {
    justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.chipBg,
  },
  otpBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  notice: { color: colors.green, fontSize: 12, marginTop: 6, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13, marginTop: space.md, fontWeight: '600' },
  submit: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center', marginTop: space.lg,
  },
  submitText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.md,
    paddingVertical: 13, marginTop: space.lg, backgroundColor: colors.surface,
  },
  googleG: { color: '#4285F4', fontWeight: '900', fontSize: 18 },
  googleText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  demo: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: space.md },
});
