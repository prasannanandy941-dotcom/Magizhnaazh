import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  Users as UsersIcon,
  Store,
  Tag,
  MapPin,
  Calendar,
  ClipboardList,
  Star,
  MessageSquare,
  AlertCircle,
  Image as ImageIcon,
  Megaphone,
  Ticket,
  Wallet,
  Settings as SettingsIcon,
  BarChart3,
  Activity,
} from 'lucide-react';
import { User } from '../../../packages/shared-types';
import { AuthGate } from './components/AuthGate';
import { FloralGoldBackground } from './components/FloralGoldBackground';
import { DashboardTab } from './components/DashboardTab';
import { UsersTab } from './components/UsersTab';
import { VendorsTab } from './components/VendorsTab';
import { CategoriesTab } from './components/CategoriesTab';
import { LocationsTab } from './components/LocationsTab';
import { EventsTab } from './components/EventsTab';
import { BookingsTab } from './components/BookingsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { FeedbackTab } from './components/FeedbackTab';
import { ComplaintsTab } from './components/ComplaintsTab';
import { InvitationTemplatesTab } from './components/InvitationTemplatesTab';
import { BannersTab } from './components/BannersTab';
import { CouponsTab } from './components/CouponsTab';
import { SettingsTab } from './components/SettingsTab';
import { SettlementsTab } from './components/SettlementsTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { EcosystemMonitor } from './components/EcosystemMonitor';
import { fetchSettings, GATEWAY_URL } from './api';

const THEME_KEY = 'magizhnaazh_theme';
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
}

type TabKey =
  | 'dashboard' | 'monitor' | 'users' | 'vendors' | 'categories' | 'locations' | 'events' | 'bookings'
  | 'reviews' | 'feedback' | 'complaints' | 'templates' | 'banners' | 'coupons' | 'settlements' | 'settings' | 'analytics';

const NAV: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'monitor', label: 'System Monitor', icon: Activity },
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'vendors', label: 'Vendors', icon: Store },
  { key: 'categories', label: 'Categories', icon: Tag },
  { key: 'locations', label: 'Locations', icon: MapPin },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'bookings', label: 'Bookings', icon: ClipboardList },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  { key: 'complaints', label: 'Complaints', icon: AlertCircle },
  { key: 'templates', label: 'Invitation Templates', icon: ImageIcon },
  { key: 'banners', label: 'Banners', icon: Megaphone },
  { key: 'coupons', label: 'Offers & Coupons', icon: Ticket },
  { key: 'settlements', label: 'Settlements', icon: Wallet },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('magizhnaazh_admin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('magizhnaazh_admin_token'));
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  // Apply the site-wide theme: use the locally-remembered choice immediately
  // (no flash), then reconcile with the server's platform setting so the
  // admin + customer apps stay in sync with whatever admin last chose.
  useEffect(() => {
    // Proactively wake up backend microservices on mount to avoid cold-start 502/504 errors on Render
    const endpoints = [
      '/api/v1/auth/me',
      '/api/v1/vendors',
      '/api/v1/bookings',
      '/api/v1/events',
      '/api/v1/invitations',
      '/api/v1/guests'
    ];
    endpoints.forEach(path => {
      fetch(`${GATEWAY_URL}${path}`).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const local = (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null) || 'dark';
    applyTheme(local);
    if (!token) return;
    fetchSettings(token)
      .then((res) => {
        const serverTheme = res.data?.settings.theme;
        if (serverTheme && serverTheme !== local) {
          localStorage.setItem(THEME_KEY, serverTheme);
          applyTheme(serverTheme);
        }
      })
      .catch(() => {/* keep local theme */});
  }, [token]);

  const handleAuthSuccess = (loggedInUser: User, newToken: string) => {
    localStorage.setItem('magizhnaazh_admin_user', JSON.stringify(loggedInUser));
    localStorage.setItem('magizhnaazh_admin_token', newToken);
    setUser(loggedInUser);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('magizhnaazh_admin_user');
    localStorage.removeItem('magizhnaazh_admin_token');
    setUser(null);
    setToken(null);
  };

  if (!user || !token) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans">
      {/* App-wide romantic-celebration backdrop, fixed behind all scrolling content */}
      <div id="app-bg" className="fixed inset-0 -z-10">
        <FloralGoldBackground />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-800 bg-slate-950/70 backdrop-blur-xl">
        <div className="px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#e85d8a] via-[#d4af37] to-[#b8336a] flex items-center justify-center font-bold text-white shadow-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl text-white">Magizhnaazh Super Admin</span>
              <span className="block text-[10px] text-rose-400 font-bold uppercase tracking-wider">Governance & Microservices Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="hidden sm:block text-slate-400">
              <strong className="text-slate-200">{user.name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-rose-400 font-bold text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 border-r border-slate-800 bg-slate-950/60 py-6 px-3 hidden md:block">
          <div className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all text-left ${
                    active
                      ? 'bg-gradient-to-r from-[#e85d8a]/80 to-[#b8336a]/80 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Mobile tab select */}
        <div className="md:hidden px-4 pt-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as TabKey)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-bold"
          >
            {NAV.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </div>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 py-8 max-w-6xl">
          {activeTab === 'dashboard' && <DashboardTab token={token} />}
          {activeTab === 'monitor' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-3xl text-white">System Monitor</h1>
                <p className="text-slate-400 text-sm mt-1">Live health, response times, alerts, dependencies & auto-restart across all microservices</p>
              </div>
              <EcosystemMonitor token={token} />
            </div>
          )}
          {activeTab === 'users' && <UsersTab token={token} currentUserId={user.id} />}
          {activeTab === 'vendors' && <VendorsTab token={token} />}
          {activeTab === 'categories' && <CategoriesTab token={token} />}
          {activeTab === 'locations' && <LocationsTab token={token} />}
          {activeTab === 'events' && <EventsTab token={token} />}
          {activeTab === 'bookings' && <BookingsTab token={token} />}
          {activeTab === 'reviews' && <ReviewsTab token={token} />}
          {activeTab === 'feedback' && <FeedbackTab token={token} />}
          {activeTab === 'complaints' && <ComplaintsTab token={token} />}
          {activeTab === 'templates' && <InvitationTemplatesTab token={token} />}
          {activeTab === 'banners' && <BannersTab token={token} />}
          {activeTab === 'coupons' && <CouponsTab token={token} />}
          {activeTab === 'settlements' && <SettlementsTab token={token} />}
          {activeTab === 'settings' && <SettingsTab token={token} />}
          {activeTab === 'analytics' && <AnalyticsTab token={token} />}
        </main>
      </div>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © 2026 Magizhnaazh Super Admin Governance Portal — Port 3002
      </footer>
    </div>
  );
}
