import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as api from '../api';
import type { Vendor } from '../types';
import type { RootNav } from '../navTypes';
import { colors, radius, space, fonts } from '../theme';

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
  const loc = [vendor.location?.address, vendor.location?.city].filter(Boolean).join(', ');
  const pkgCount = vendor.packages?.length ?? 0;
  const rating = vendor.ratingAverage;
  return (
    <View style={styles.card}>
      <View style={styles.imgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, styles.cardImgFallback]}>
            <Text style={styles.cardImgFallbackText}>{vendor.category}</Text>
          </View>
        )}
        <View style={styles.imgScrim} />

        <View style={styles.imgTopRow}>
          <View style={styles.catBadge}><Text style={styles.catBadgeText}>{vendor.category}</Text></View>
          <View style={styles.heartBtn}><Text style={styles.heart}>♡</Text></View>
        </View>

        <View style={styles.imgBottomRow}>
          {typeof rating === 'number' && rating > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {rating.toFixed(1)}{vendor.reviewCount ? ` (${vendor.reviewCount})` : ''}</Text>
            </View>
          )}
          {vendor.isVerified && (
            <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{vendor.businessName}</Text>
        {!!loc && <Text style={styles.cardMeta} numberOfLines={1}>📍 {loc}</Text>}
        {!!vendor.description && <Text style={styles.cardDesc} numberOfLines={2}>{vendor.description}</Text>}

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.startingLabel}>STARTING FROM</Text>
            <Text style={styles.price}>₹{(vendor.startingPrice || 0).toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.pkgCount}>{pkgCount} Package{pkgCount === 1 ? '' : 's'}</Text>
        </View>

        <TouchableOpacity style={styles.viewBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
  chipActive: { backgroundColor: '#6d5ef6', borderColor: '#6d5ef6' },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: colors.onPrimary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  imgWrap: { height: 200, width: '100%' },
  cardImg: { width: '100%', height: '100%', backgroundColor: colors.surfaceAlt },
  cardImgFallback: { alignItems: 'center', justifyContent: 'center' },
  cardImgFallbackText: { color: colors.textMuted, fontWeight: '700' },
  imgScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', backgroundColor: 'rgba(10,4,8,0.55)' },
  imgTopRow: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(18,6,11,0.8)', borderWidth: 1, borderColor: 'rgba(107,33,64,0.5)' },
  catBadgeText: { color: '#f1e3ea', fontSize: 11, fontWeight: '700' },
  heartBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(18,6,11,0.8)', borderWidth: 1, borderColor: 'rgba(107,33,64,0.5)', alignItems: 'center', justifyContent: 'center' },
  heart: { color: '#f1e3ea', fontSize: 16 },
  imgBottomRow: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md, backgroundColor: 'rgba(212,175,55,0.92)' },
  ratingText: { color: '#12060b', fontSize: 12, fontWeight: '800' },
  verifiedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: 'rgba(18,6,11,0.8)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
  verifiedText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  cardBody: { padding: space.lg },
  cardTitle: { fontSize: 18, fontFamily: fonts.displayBlack, color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  cardDesc: { fontSize: 12, color: '#e0c3d0', marginTop: space.sm, lineHeight: 18 },
  priceRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  startingLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
  price: { fontSize: 20, fontFamily: fonts.displayBlack, color: colors.gold, marginTop: 2 },
  pkgCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  viewBtn: { marginTop: space.md, backgroundColor: '#6d5ef6', borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  viewBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: space.lg },
});
