import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'vendors' | 'profile'>('home');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Magizhnaazh (மகிழ்னாள்)</Text>
        <Text style={styles.headerSub}>Mobile App — iOS & Android</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'home' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Smart Event Planning Platform</Text>
            <Text style={styles.cardDesc}>Search venues, caterers, photographers, and design Canva digital invites on your mobile device.</Text>
            
            <View style={styles.badgeRow}>
              <View style={styles.badge}><Text style={styles.badgeText}>100% Verified Vendors</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>Local File Uploads</Text></View>
            </View>
          </View>
        )}

        {activeTab === 'events' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Planned Events</Text>
            <Text style={styles.cardDesc}>Felix & Priya Wedding Celebration</Text>
            <Text style={styles.budgetAmount}>₹8,00,000 Total Target Budget</Text>
          </View>
        )}

        {activeTab === 'vendors' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Vendor Marketplace</Text>
            <Text style={styles.cardDesc}>The Leela Palace Grand Ballroom • Chennai</Text>
            <Text style={styles.cardPrice}>Starting ₹1,50,000</Text>
          </View>
        )}

        {activeTab === 'profile' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>User Account & Settings</Text>
            <Text style={styles.cardDesc}>Customer Role: Felix Kumar</Text>
            <Text style={styles.cardDesc}>Connected to Microservices Gateway at http://localhost:8000</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Mobile Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('events')}>
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabActive]}>My Events</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('vendors')}>
          <Text style={[styles.tabText, activeTab === 'vendors' && styles.tabActive]}>Vendors</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 6,
  },
  budgetAmount: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  cardPrice: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  badge: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  tabActive: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },
});
