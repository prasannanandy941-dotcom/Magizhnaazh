import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../auth';
import * as api from '../api';
import type { Booking } from '../types';
import { colors, radius, space } from '../theme';

const STATUS_COLOR: Record<string, string> = {
  confirmed: colors.green,
  pending: colors.gold,
  cancelled: colors.danger,
  completed: colors.primary,
};

export default function BookingsScreen() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      setBookings(await api.fetchMyBookings(token));
    } catch (e: any) {
      setError(e.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <FlatList
      style={{ backgroundColor: 'transparent' }}
      data={bookings}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>{error || 'No bookings yet.\nBrowse the marketplace to book a vendor.'}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const status = (item.status || 'pending').toLowerCase();
        return (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.vendor} numberOfLines={1}>{item.vendorName || 'Vendor'}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[status] || colors.textMuted }]}>{status}</Text>
            </View>
            {!!item.packageName && <Text style={styles.pkg}>{item.packageName}</Text>}
            <View style={styles.bottomRow}>
              {typeof item.amount === 'number' && <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>}
              {!!item.eventDate && <Text style={styles.date}>{item.eventDate}</Text>}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  empty: { textAlign: 'center', color: colors.textMuted, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md,
    borderWidth: 1, borderColor: colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vendor: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },
  status: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize', marginLeft: space.sm },
  pkg: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  amount: { fontSize: 15, fontWeight: '800', color: colors.gold },
  date: { fontSize: 12, color: colors.textMuted },
});
