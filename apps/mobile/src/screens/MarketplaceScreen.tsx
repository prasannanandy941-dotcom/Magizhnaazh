import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as api from '../api';
import type { Vendor } from '../types';
import type { RootNav } from '../navTypes';
import { colors, radius, space } from '../theme';

const CATEGORIES = [
  'All', 'Venue', 'Catering', 'Media', 'Decoration', 'Makeup & Beauty', 'Transport',
  'Pujari/Priest', 'Invitation', 'Printing', 'Return Gifts', 'Entertainment', 'Music/DJ',
  'Lighting', 'Flowers', 'Mehendi', 'Event Host/Anchor', 'Security', 'Cleaning',
  'Rental Equipment', 'Utensils for Rent', 'Wedding Planner', 'Corporate Event Services',
];

export default function MarketplaceScreen() {
  const nav = useNavigation<RootNav>();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await api.fetchVendors({
        search: search.trim() || undefined,
        category: category === 'All' ? undefined : category,
      });
      setVendors(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load vendors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, category]);

  useEffect(() => { load(); }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
          placeholder="Search vendors, venues, caterers…"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.chipsWrap}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c}
          contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, category === item && styles.chipActive]}
              onPress={() => setCategory(item)}
            >
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: space.lg, paddingTop: space.sm, gap: space.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <Text style={styles.empty}>{error || 'No vendors found. Pull to refresh.'}</Text>
          }
          renderItem={({ item }) => <VendorCard vendor={item} onPress={() => nav.navigate('VendorDetail', { vendorId: item.id, vendorName: item.businessName })} />}
        />
      )}
    </View>
  );
}

function VendorCard({ vendor, onPress }: { vendor: Vendor; onPress: () => void }) {
  const img = vendor.galleryImages?.[0];
  const city = vendor.location?.city;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {img ? (
        <Image source={{ uri: img }} style={styles.cardImg} />
      ) : (
        <View style={[styles.cardImg, styles.cardImgFallback]}>
          <Text style={styles.cardImgFallbackText}>{vendor.category}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{vendor.businessName}</Text>
          {vendor.isVerified && <Text style={styles.verified}>✓ Verified</Text>}
        </View>
        <Text style={styles.cardMeta}>{vendor.category}{city ? ` • ${city}` : ''}</Text>
        <View style={styles.cardBottomRow}>
          <Text style={styles.price}>From ₹{(vendor.startingPrice || 0).toLocaleString('en-IN')}</Text>
          {typeof vendor.ratingAverage === 'number' && vendor.ratingAverage > 0 && (
            <Text style={styles.rating}>★ {vendor.ratingAverage.toFixed(1)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.md },
  search: {
    borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, color: colors.text, backgroundColor: colors.surface, fontSize: 15,
  },
  chipsWrap: { paddingVertical: space.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: colors.onPrimary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  cardImg: { width: '100%', height: 150, backgroundColor: colors.surfaceAlt },
  cardImgFallback: { alignItems: 'center', justifyContent: 'center' },
  cardImgFallbackText: { color: colors.textMuted, fontWeight: '700' },
  cardBody: { padding: space.md },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },
  verified: { fontSize: 10, fontWeight: '800', color: colors.green, marginLeft: 8 },
  cardMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  price: { fontSize: 15, fontWeight: '800', color: colors.gold },
  rating: { fontSize: 13, fontWeight: '700', color: colors.primary },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: space.lg },
});
