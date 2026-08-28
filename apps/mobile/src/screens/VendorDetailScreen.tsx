import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Dimensions,
  TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as api from '../api';
import { useAuth } from '../auth';
import type { Vendor, VendorPackage, EventItem } from '../types';
import type { RootStackParamList, RootNav } from '../navTypes';
import { colors, radius, space } from '../theme';

const { width } = Dimensions.get('window');

function advanceFor(vendor: Vendor, price: number): number {
  const flat = vendor.policies?.advanceAmount;
  if (typeof flat === 'number' && flat > 0) return price > 0 ? Math.min(flat, price) : flat;
  const pct = vendor.policies?.advancePercentage ?? 20;
  return Math.round((price * pct) / 100);
}

export default function VendorDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VendorDetail'>>();
  const nav = useNavigation<RootNav>();
  const { token } = useAuth();
  const { vendorId } = route.params;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPkgId, setSelectedPkgId] = useState<string | undefined>(undefined);
  const [showBook, setShowBook] = useState(false);

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
  const selectedPkg = vendor.packages?.find((p) => p.id === selectedPkgId);
  const price = selectedPkg?.price || vendor.startingPrice || 0;
  const advance = advanceFor(vendor, price);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
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
            <Text style={styles.hint}>Tap a package to select it — or book at the starting price.</Text>
            {vendor.packages.map((p) => {
              const sel = selectedPkgId === p.id;
              return (
                <TouchableOpacity key={p.id} style={[styles.pkg, sel && styles.pkgSel]} onPress={() => setSelectedPkgId(sel ? undefined : p.id)} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pkgName}>{sel ? '✓ ' : ''}{p.packageName}</Text>
                    {!!p.description && <Text style={styles.pkgDesc} numberOfLines={2}>{p.description}</Text>}
                  </View>
                  <Text style={styles.pkgPrice}>₹{(p.price || 0).toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {!!vendor.contactPhone && (
          <>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.desc}>{vendor.contactPhone}</Text>
          </>
        )}
      </View>
    </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel} numberOfLines={1}>{selectedPkg ? selectedPkg.packageName : 'Starting price'}</Text>
          <Text style={styles.footerAdvance}>Advance ₹{advance.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={() => setShowBook(true)}>
          <Text style={styles.bookBtnText}>Book & Pay Advance</Text>
        </TouchableOpacity>
      </View>

      <BookModal
        visible={showBook}
        onClose={() => setShowBook(false)}
        vendor={vendor}
        token={token}
        selectedPkg={selectedPkg}
        price={price}
        advance={advance}
      />
    </View>
  );
}

function BookModal({ visible, onClose, vendor, token, selectedPkg, price, advance }: {
  visible: boolean;
  onClose: () => void;
  vendor: Vendor;
  token: string | null;
  selectedPkg?: VendorPackage;
  price: number;
  advance: number;
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!visible || !token) return;
    setLoadingEvents(true);
    api.fetchEvents(token)
      .then((list) => { setEvents(list); if (list[0]) setEventId((cur) => cur ?? list[0].id); })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, [visible, token]);

  const confirm = async () => {
    if (!token) return;
    if (!eventId) { Alert.alert('Pick an event', 'Create an event in the Events tab first, then book against it.'); return; }
    setPlacing(true);
    try {
      const ev = events.find((e) => e.id === eventId);
      await api.createBooking(token, {
        vendorId: vendor.id,
        vendorName: vendor.businessName,
        vendorCategory: vendor.category,
        eventId,
        packageId: selectedPkg?.id,
        packageName: selectedPkg?.packageName,
        price,
        eventDate: ev?.date,
        notes: notes.trim() || undefined,
        advancePaymentClaimed: true,
      });
      onClose();
      Alert.alert('Booking placed', 'Your booking was sent to the vendor. They will verify your advance and confirm it — track it under My Events → Bookings.');
    } catch (e: any) {
      Alert.alert('Booking failed', e.message || 'Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book & Pay Advance</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
            <Text style={styles.summary}>{vendor.businessName}{selectedPkg ? ` — ${selectedPkg.packageName}` : ''}</Text>
            <Text style={styles.summaryPrice}>Total ₹{price.toLocaleString('en-IN')} • Advance ₹{advance.toLocaleString('en-IN')}</Text>

            <Text style={styles.modalLabel}>Book for which event?</Text>
            {loadingEvents ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: space.md }} />
            ) : events.length === 0 ? (
              <Text style={styles.hint}>No events yet — create one in the Events tab, then come back to book.</Text>
            ) : (
              events.map((e) => (
                <TouchableOpacity key={e.id} style={[styles.eventRow, eventId === e.id && styles.eventRowSel]} onPress={() => setEventId(e.id)}>
                  <Text style={styles.eventName}>{eventId === e.id ? '● ' : '○ '}{e.title}</Text>
                  <Text style={styles.eventDate}>{e.date}</Text>
                </TouchableOpacity>
              ))
            )}

            {!!vendor.upiId && (
              <View style={styles.payBox}>
                <Text style={styles.payLabel}>Pay the advance to the vendor's UPI</Text>
                <Text style={styles.upi}>{vendor.upiId}</Text>
                <Text style={styles.payHint}>Pay ₹{advance.toLocaleString('en-IN')} using any UPI app, then confirm below.</Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Note to vendor (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything specific you want…"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <TouchableOpacity style={styles.confirmBtn} onPress={confirm} disabled={placing || events.length === 0}>
              {placing ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.confirmText}>I've paid the advance — Confirm booking</Text>}
            </TouchableOpacity>
            <Text style={styles.disclaimer}>The vendor verifies your payment and confirms the booking on their side.</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: space.sm },
  pkgSel: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surfaceAlt },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  footerLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  footerAdvance: { fontSize: 16, fontWeight: '800', color: colors.gold },
  bookBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 14, borderRadius: radius.md },
  bookBtnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 14 },
  // booking modal
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(42,10,28,0.4)' },
  modalCard: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '92%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  close: { fontSize: 18, color: colors.textMuted, paddingHorizontal: 6 },
  summary: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryPrice: { fontSize: 13, color: colors.gold, fontWeight: '700', marginTop: 2 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: space.lg, marginBottom: space.sm },
  eventRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, marginBottom: space.sm,
  },
  eventRowSel: { borderColor: colors.primary, borderWidth: 2 },
  eventName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  eventDate: { fontSize: 12, color: colors.textMuted, marginLeft: space.sm },
  payBox: { backgroundColor: colors.chipBg, borderRadius: radius.md, padding: space.md, marginTop: space.lg },
  payLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  upi: { fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: 4 },
  payHint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  noteInput: {
    borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text,
    backgroundColor: colors.surface, minHeight: 70, textAlignVertical: 'top',
  },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: space.lg },
  confirmText: { color: colors.onPrimary, fontWeight: '800', fontSize: 14 },
  disclaimer: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: space.sm, marginBottom: space.md },
});
