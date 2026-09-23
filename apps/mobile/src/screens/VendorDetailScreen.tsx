import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Dimensions,
  TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as api from '../api';
import { useAuth } from '../auth';
import type { Vendor, VendorPackage, VenuePackageDetails, EventItem } from '../types';
import type { RootStackParamList, RootNav } from '../navTypes';
import { colors, radius, space, fonts } from '../theme';
import { AVAILABILITY_SLOTS, isSlotBooked, offeredSlotIds, openSlots, slotLabel } from '../slots';

const { width } = Dimensions.get('window');

function advanceFor(vendor: Vendor, price: number): number {
  const flat = vendor.policies?.advanceAmount;
  if (typeof flat === 'number' && flat > 0) return price > 0 ? Math.min(flat, price) : flat;
  const pct = vendor.policies?.advancePercentage ?? 20;
  return Math.round((price * pct) / 100);
}

// Compact hall spec shown under a Venue package: type/class (with prices),
// sessions, catering (+ menu/sample image), and the offered Yes-features with
// their optional prices and images.
const VENUE_FEATURES: [keyof VenuePackageDetails | string, string][] = [
  ['parking', 'Parking'], ['powerBackup', 'Power backup'], ['bridalRoom', 'Bridal/green room'],
  ['stageIncluded', 'Stage'], ['valetService', 'Valet'],
];
function VenueDetails({ v }: { v: VenuePackageDetails }) {
  const inr = (n?: number) => (n ? ` — ₹${n.toLocaleString('en-IN')}` : '');
  const offered = VENUE_FEATURES.filter(([key]) => (v as any)[key] === true);
  const featureImgs = offered.filter(([key]) => v.featureImages?.[key as string]);
  return (
    <View style={styles.venueBox}>
      <View style={styles.venueChips}>
        {!!v.hallType && <Text style={styles.venueChip}>{v.hallType}{inr(v.hallTypePrice)}</Text>}
        {!!v.hallClass && <Text style={styles.venueChip}>{v.hallClass}{inr(v.hallClassPrice)}</Text>}
        {(v.sessions || []).map((s) => <Text key={s} style={styles.venueSession}>{s}</Text>)}
      </View>
      {!!v.accommodationRooms && <Text style={styles.venueLine}>Accommodation rooms: {v.accommodationRooms}</Text>}
      {!!v.cateringPolicy && <Text style={styles.venueLine}>Catering: {v.cateringPolicy}{inr(v.cateringPrice)}</Text>}
      {!!v.cateringImage && <Image source={{ uri: v.cateringImage }} style={styles.venueImg} />}
      {offered.length > 0 && (
        <Text style={styles.venueLine}>
          {offered.map(([key, label]) => `${label}${inr(v.featurePrices?.[key as string])}`).join(' · ')}
        </Text>
      )}
      {featureImgs.length > 0 && (
        <View style={styles.venueChips}>
          {featureImgs.map(([key]) => <Image key={key as string} source={{ uri: v.featureImages![key as string] }} style={styles.venueImg} />)}
        </View>
      )}
    </View>
  );
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
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <ScrollView style={{ backgroundColor: 'transparent' }} contentContainerStyle={{ paddingBottom: 40 }}>
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
                    {vendor.category === 'Venue' && p.venue && <VenueDetails v={p.venue} />}
                  </View>
                  <Text style={styles.pkgPrice}>₹{(p.price || 0).toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {((vendor.availableDates?.length ?? 0) > 0 || (vendor.bookedDates?.length ?? 0) > 0) && (
          <>
            <Text style={styles.sectionTitle}>Available Dates & Sessions</Text>
            <Text style={styles.hint}>Open dates and slots offered by this vendor.</Text>
            <View style={styles.datesContainer}>
              {(vendor.availableDates || []).map((d) => (
                <View key={d} style={styles.dateBadgeOpen}>
                  <Text style={styles.dateBadgeTextOpen}>{d}</Text>
                  <Text style={styles.dateBadgeSubOpen}>Available</Text>
                </View>
              ))}
              {(vendor.bookedDates || []).map((d) => (
                <View key={d} style={styles.dateBadgeBooked}>
                  <Text style={styles.dateBadgeTextBooked}>{d}</Text>
                  <Text style={styles.dateBadgeSubBooked}>BOOKED</Text>
                </View>
              ))}
            </View>
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
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View>
            <Text style={styles.footerLabel}>Advance</Text>
            <Text style={styles.footerAdvance}>₹{advance.toLocaleString('en-IN')}</Text>
          </View>
          <View style={{ width: 1, height: 26, backgroundColor: colors.border }} />
          <View>
            <Text style={styles.footerLabel}>Total bill</Text>
            <Text style={styles.footerTotal}>₹{price.toLocaleString('en-IN')}</Text>
          </View>
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

  const hasFixedDates = (vendor.availableDates?.length ?? 0) > 0;
  const [selectedDate, setSelectedDate] = useState<string>(vendor.availableDates?.[0] || '');
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  useEffect(() => {
    if (!visible || !token) return;
    setLoadingEvents(true);
    api.fetchEvents(token)
      .then((list) => {
        setEvents(list);
        if (list[0]) {
          setEventId((cur) => cur ?? list[0].id);
          if (!hasFixedDates && list[0].date) setSelectedDate((cur) => cur || list[0].date);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, [visible, token, hasFixedDates]);

  useEffect(() => {
    if (!selectedDate) { setSelectedSlot(''); return; }
    const open = openSlots(vendor, selectedDate);
    setSelectedSlot(open.length ? open[0].id : '');
  }, [selectedDate, vendor.bookedSlots, vendor.bookedDates]);

  const onSelectEvent = (e: EventItem) => {
    setEventId(e.id);
    if (!hasFixedDates && e.date) {
      setSelectedDate(e.date);
    }
  };

  const isCurrentSlotBooked = Boolean(selectedDate && selectedSlot && isSlotBooked(vendor, selectedDate, selectedSlot));
  const isDateFullyBooked = Boolean(selectedDate && (vendor.bookedDates || []).includes(selectedDate));

  const confirm = async () => {
    if (!token) return;
    if (!eventId) { Alert.alert('Pick an event', 'Create an event in the Events tab first, then book against it.'); return; }
    if (hasFixedDates && !selectedDate) {
      Alert.alert('Pick a date', 'Please choose an available date for this vendor.');
      return;
    }
    if (isDateFullyBooked) {
      Alert.alert('Date Booked', 'This date has already been booked by another customer. Please choose another date.');
      return;
    }
    if (isCurrentSlotBooked) {
      Alert.alert('Session Booked', 'This date and session has already been booked by another customer. Please choose another date or session.');
      return;
    }

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
        eventDate: selectedDate || ev?.date,
        timeSlot: selectedSlot || undefined,
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
            <View style={styles.summaryAmounts}>
              <View style={styles.summaryAmountBox}>
                <Text style={styles.summaryAmountLabel}>Total amount</Text>
                <Text style={styles.summaryAmountValue}>₹{price.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.summaryAmountBox, styles.summaryAdvanceBox]}>
                <Text style={styles.summaryAdvanceLabel}>Advance required</Text>
                <Text style={styles.summaryAdvanceValue}>₹{advance.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Vendor Available Dates */}
            {(hasFixedDates || (vendor.bookedDates?.length ?? 0) > 0) && (
              <>
                <Text style={styles.modalLabel}>Pick an available date</Text>
                <View style={styles.chipRow}>
                  {(vendor.availableDates || []).map((d) => {
                    const sel = selectedDate === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dateChip, sel && styles.dateChipSel]}
                        onPress={() => setSelectedDate(d)}
                      >
                        <Text style={[styles.dateChipText, sel && styles.dateChipTextSel]}>{d}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {(vendor.bookedDates || []).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={styles.dateChipBooked}
                      onPress={() => Alert.alert('Date Booked', 'This date has already been booked by another customer. Please choose another date.')}
                    >
                      <Text style={styles.dateChipTextBooked}>{d}</Text>
                      <Text style={styles.badgeBooked}>BOOKED</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Session / Slot Picker */}
            {selectedDate ? (
              <>
                <Text style={styles.modalLabel}>Pick a session / slot</Text>
                <View style={styles.chipRow}>
                  {AVAILABILITY_SLOTS.filter((s) => offeredSlotIds(vendor, selectedDate).includes(s.id)).map((s) => {
                    const booked = isSlotBooked(vendor, selectedDate, s.id);
                    const sel = selectedSlot === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.slotChip,
                          sel && !booked && styles.slotChipSel,
                          booked && styles.slotChipBooked,
                        ]}
                        onPress={() => {
                          if (booked) {
                            Alert.alert('Session Booked', 'This session has already been booked by another customer. Please choose another date or session.');
                          } else {
                            setSelectedSlot(s.id);
                          }
                        }}
                      >
                        <Text style={[
                          styles.slotChipText,
                          sel && !booked && styles.slotChipTextSel,
                          booked && styles.slotChipTextBooked,
                        ]}>
                          {s.label}
                        </Text>
                        {booked && <Text style={styles.badgeBooked}>Booked</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isCurrentSlotBooked && (
                  <View style={styles.conflictBanner}>
                    <Text style={styles.conflictText}>
                      ⚠️ This session has already been booked by another customer. Please choose another session or date.
                    </Text>
                  </View>
                )}

                {openSlots(vendor, selectedDate).length === 0 && (
                  <View style={styles.conflictBanner}>
                    <Text style={styles.conflictText}>
                      ⚠️ All sessions on this date are booked by other customers. Please pick another date.
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            <Text style={styles.modalLabel}>Book for which event?</Text>
            {loadingEvents ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: space.md }} />
            ) : events.length === 0 ? (
              <Text style={styles.hint}>No events yet — create one in the Events tab, then come back to book.</Text>
            ) : (
              events.map((e) => (
                <TouchableOpacity key={e.id} style={[styles.eventRow, eventId === e.id && styles.eventRowSel]} onPress={() => onSelectEvent(e)}>
                  <Text style={styles.eventName}>{eventId === e.id ? '● ' : '○ '}{e.title}</Text>
                  <Text style={styles.eventDate}>{e.date}</Text>
                </TouchableOpacity>
              ))
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

            <TouchableOpacity
              style={[styles.confirmBtn, (placing || events.length === 0 || isCurrentSlotBooked || isDateFullyBooked) && styles.confirmBtnDisabled]}
              onPress={confirm}
              disabled={placing || events.length === 0 || isCurrentSlotBooked || isDateFullyBooked}
            >
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
  title: { fontSize: 22, fontFamily: fonts.displayBlack, color: colors.text, flex: 1 },
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
  venueBox: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  venueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  venueChip: { fontSize: 11, color: colors.text, backgroundColor: colors.chipBg, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  venueSession: { fontSize: 11, fontWeight: '700', color: colors.goldBright, backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  venueLine: { fontSize: 11, color: colors.textMuted },
  venueImg: { width: 64, height: 64, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: space.sm },
  pkgSel: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surfaceAlt },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  footerLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  footerAdvance: { fontSize: 16, fontWeight: '800', color: colors.gold },
  footerTotal: { fontSize: 16, fontWeight: '800', color: colors.text },
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
  summaryAmounts: { gap: space.sm, marginTop: space.sm },
  summaryAmountBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  summaryAdvanceBox: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  summaryAmountLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  summaryAdvanceLabel: { fontSize: 12, color: colors.gold, fontWeight: '600' },
  summaryAmountValue: { fontSize: 15, color: colors.text, fontWeight: '800' },
  summaryAdvanceValue: { fontSize: 15, color: colors.gold, fontWeight: '800' },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: space.lg, marginBottom: space.sm },
  eventRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, marginBottom: space.sm,
  },
  eventRowSel: { borderColor: colors.primary, borderWidth: 2 },
  eventName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  eventDate: { fontSize: 12, color: colors.textMuted, marginLeft: space.sm },
  noteInput: {
    borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text,
    backgroundColor: colors.surface, minHeight: 70, textAlignVertical: 'top',
  },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: space.lg },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: colors.onPrimary, fontWeight: '800', fontSize: 14 },
  disclaimer: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: space.sm, marginBottom: space.md },
  datesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dateBadgeOpen: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: 'rgba(212,175,55,0.08)' },
  dateBadgeTextOpen: { fontSize: 13, fontWeight: '700', color: colors.gold },
  dateBadgeSubOpen: { fontSize: 10, color: colors.green, fontWeight: '700' },
  dateBadgeBooked: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', backgroundColor: 'rgba(220,38,38,0.1)' },
  dateBadgeTextBooked: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textDecorationLine: 'line-through' },
  dateBadgeSubBooked: { fontSize: 10, color: colors.danger, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dateChipSel: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  dateChipTextSel: { color: colors.onPrimary, fontWeight: '700' },
  dateChipBooked: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', backgroundColor: 'rgba(220,38,38,0.08)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateChipTextBooked: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textDecorationLine: 'line-through' },
  slotChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotChipSel: { borderColor: colors.primary, backgroundColor: colors.primary },
  slotChipBooked: { borderColor: 'rgba(220,38,38,0.3)', backgroundColor: 'rgba(220,38,38,0.08)' },
  slotChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  slotChipTextSel: { color: colors.onPrimary, fontWeight: '700' },
  slotChipTextBooked: { color: colors.textMuted, textDecorationLine: 'line-through' },
  badgeBooked: { fontSize: 9, fontWeight: '800', color: colors.danger, backgroundColor: 'rgba(220,38,38,0.15)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  conflictBanner: { marginTop: space.sm, padding: space.sm + 2, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)', backgroundColor: 'rgba(220,38,38,0.12)' },
  conflictText: { fontSize: 12, fontWeight: '600', color: colors.danger, lineHeight: 17 },
});
