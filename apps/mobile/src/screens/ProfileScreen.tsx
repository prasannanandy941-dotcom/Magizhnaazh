import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../auth';
import { GATEWAY_URL } from '../config';
import { colors, radius, space } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.lg }}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <View style={styles.card}>
        <Row label="Email" value={user?.email || '—'} />
        {!!user?.phone && <Row label="Phone" value={user.phone} />}
        <Row label="Connected to" value={GATEWAY_URL} last />
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Magizhnaazh Mobile • v1.0.0</Text>
    </ScrollView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginVertical: space.xl },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.onPrimary, fontSize: 34, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: space.md },
  role: { fontSize: 13, color: colors.textMuted, textTransform: 'capitalize', marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: space.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: space.md },
  logout: {
    marginTop: space.xl, borderWidth: 2, borderColor: colors.danger, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: space.xl },
});
