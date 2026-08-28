import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import * as api from '../api';
import type { Vendor } from '../types';
import type { RootStackParamList } from '../navTypes';
import { colors, radius, space } from '../theme';

const { width } = Dimensions.get('window');

export default function VendorDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VendorDetail'>>();
  const { vendorId } = route.params;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setVendor(await api.fetchVendorById(vendorId));
      } catch (e: any) {
        setError(e.message || 'Failed to load vendor.');
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  if (error || !vendor) {
    return <View style={styles.center}><Text style={styles.error}>{error || 'Vendor not found.'}</Text></View>;
  }

  const gallery = vendor.galleryImages ?? [];
  const city = vendor.location?.city;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: space.xl }}>
      {gallery.length > 0 && (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {gallery.map((uri, i) => (
            <Image key={i} source={{ uri }} style={{ width, height: 240, backgroundColor: colors.surfaceAlt }} />
          ))}
        </ScrollView>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{vendor.businessName}</Text>
          {vendor.isVerified && <Text style={styles.verified}>✓ Verified</Text>}
        </View>
        <Text style={styles.meta}>{vendor.category}{city ? ` • ${city}` : ''}</Text>

        <View style={styles.statRow}>
          <Text style={styles.price}>From ₹{(vendor.startingPrice || 0).toLocaleString('en-IN')}</Text>
          {typeof vendor.ratingAverage === 'number' && vendor.ratingAverage > 0 && (
            <Text style={styles.rating}>★ {vendor.ratingAverage.toFixed(1)}{vendor.reviewCount ? ` (${vendor.reviewCount})` : ''}</Text>
          )}
        </View>

        {!!vendor.description && (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.desc}>{vendor.description}</Text>
          </>
        )}

        {!!vendor.packages?.length && (
          <>
            <Text style={styles.sectionTitle}>Packages</Text>
            {vendor.packages.map((p) => (
              <View key={p.id} style={styles.pkg}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgName}>{p.packageName}</Text>
                  {!!p.description && <Text style={styles.pkgDesc} numberOfLines={2}>{p.description}</Text>}
                </View>
                <Text style={styles.pkgPrice}>₹{(p.price || 0).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </>
        )}

        {!!vendor.contactPhone && (
          <>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.desc}>{vendor.contactPhone}</Text>
          </>
        )}

        <Text style={styles.note}>
          To book this vendor and pay the advance, continue on the Magizhnaazh web app for now — booking from mobile is coming next.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: space.lg },
  error: { color: colors.danger, fontWeight: '600' },
  body: { padding: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 },
  verified: { fontSize: 11, fontWeight: '800', color: colors.green, marginLeft: 8 },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  price: { fontSize: 18, fontWeight: '800', color: colors.gold },
  rating: { fontSize: 15, fontWeight: '700', color: colors.primary },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: space.xl, marginBottom: space.sm },
  desc: { fontSize: 14, color: colors.text, lineHeight: 21 },
  pkg: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, marginBottom: space.sm,
  },
  pkgName: { fontSize: 15, fontWeight: '700', color: colors.text },
  pkgDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pkgPrice: { fontSize: 15, fontWeight: '800', color: colors.gold, marginLeft: space.md },
  note: {
    marginTop: space.xl, fontSize: 12, color: colors.textMuted, backgroundColor: colors.chipBg,
    padding: space.md, borderRadius: radius.md, lineHeight: 18,
  },
});
