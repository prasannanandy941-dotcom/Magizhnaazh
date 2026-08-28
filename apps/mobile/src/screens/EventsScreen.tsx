import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuth } from '../auth';
import * as api from '../api';
import type { EventItem } from '../types';
import { colors, radius, space } from '../theme';

const EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Birthday', 'Baby Shower', 'Housewarming', 'Corporate', 'Other'];

export default function EventsScreen() {
  const { token } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      setEvents(await api.fetchEvents(token));
    } catch (e: any) {
      setError(e.message || 'Failed to load events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>{error || 'No events yet.\nTap “New Event” to plan one.'}</Text>}
          renderItem={({ item }) => {
            const pct = item.totalBudget > 0 ? Math.min(100, Math.round((item.spentBudget / item.totalBudget) * 100)) : 0;
            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.type}>{item.eventType}</Text>
                </View>
                <Text style={styles.meta}>
                  {item.date}{item.location?.city ? ` • ${item.location.city}` : ''} • {item.guestCount} guests
                </Text>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Spent ₹{(item.spentBudget || 0).toLocaleString('en-IN')} of ₹{(item.totalBudget || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.pct}>{pct}%</Text>
                </View>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+  New Event</Text>
      </TouchableOpacity>

      <CreateEventModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </View>
  );
}

function CreateEventModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!token) return;
    if (!title.trim() || !city.trim() || !date.trim()) { setError('Title, city and date are required.'); return; }
    setError('');
    setSaving(true);
    try {
      await api.createEvent(token, {
        title: title.trim(),
        eventType,
        city: city.trim(),
        date: date.trim(),
        guestCount: Number(guestCount) || 0,
        totalBudget: Number(totalBudget) || 0,
      });
      // reset
      setTitle(''); setCity(''); setDate(''); setGuestCount(''); setTotalBudget(''); setEventType('Wedding');
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Could not create event.');
      Alert.alert('Error', e.message || 'Could not create event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
            <Label>Event Title</Label>
            <Input value={title} onChangeText={setTitle} placeholder="Felix & Priya Wedding" />

            <Label>Event Type</Label>
            <View style={styles.chips}>
              {EVENT_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, eventType === t && styles.chipActive]} onPress={() => setEventType(t)}>
                  <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label>City</Label>
            <Input value={city} onChangeText={setCity} placeholder="Chennai" />

            <Label>Date (YYYY-MM-DD)</Label>
            <Input value={date} onChangeText={setDate} placeholder="2026-12-15" keyboardType="numbers-and-punctuation" />

            <Label>Guest Count</Label>
            <Input value={guestCount} onChangeText={setGuestCount} placeholder="300" keyboardType="number-pad" />

            <Label>Total Budget (₹)</Label>
            <Input value={totalBudget} onChangeText={setTotalBudget} placeholder="800000" keyboardType="number-pad" />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.submit} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitText}>Create Event</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const Label = ({ children }: { children: string }) => <Text style={styles.label}>{children}</Text>;
const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput {...props} placeholderTextColor={colors.textMuted} style={styles.input} />
);

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 60, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.border },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },
  type: { fontSize: 11, fontWeight: '800', color: colors.primary, marginLeft: space.sm },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  budgetLabel: { fontSize: 12, color: colors.text, fontWeight: '600' },
  pct: { fontSize: 12, color: colors.primary, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.gold, borderRadius: 4 },
  fab: {
    position: 'absolute', right: space.lg, bottom: space.lg,
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  fabText: { color: colors.onPrimary, fontWeight: '800', fontSize: 14 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(42,10,28,0.4)' },
  modalCard: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  close: { fontSize: 18, color: colors.textMuted, paddingHorizontal: 6 },
  label: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: space.md, marginBottom: 6 },
  input: {
    borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: colors.onPrimary },
  error: { color: colors.danger, fontSize: 13, marginTop: space.md, fontWeight: '600' },
  submit: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: space.lg },
  submitText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
});
