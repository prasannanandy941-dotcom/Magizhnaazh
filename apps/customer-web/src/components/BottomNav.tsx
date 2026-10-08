import React, { useState } from 'react';
import {
  Store,
  Calendar,
  Sparkles,
  ClipboardList,
  Heart,
  User as UserIcon,
  LogOut,
  Mail,
  X,
} from 'lucide-react';
import { User } from '../../../../packages/shared-types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  wishlistCount: number;
  onOpenWishlist: () => void;
  user: User | null;
  onSignIn: () => void;
  onLogout: () => void;
  openEventWizard: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  wishlistCount,
  onOpenWishlist,
  user,
  onSignIn,
  onLogout,
  openEventWizard,
}) => {
  const [showAccountSheet, setShowAccountSheet] = useState(false);

  const allNavItems = [
    {
      id: 'marketplace',
      label: 'Explore',
      icon: Store,
      onClick: () => {
        setActiveTab('marketplace');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      onClick: () => {
        setActiveTab('events');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'budget',
      label: 'Budget',
      customIcon: <span className="font-extrabold text-[15px] leading-none">₹</span>,
      onClick: () => {
        setActiveTab('budget');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'invitations',
      label: 'Invites',
      icon: Mail,
      onClick: () => {
        setActiveTab('invitations');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ClipboardList,
      onClick: () => {
        setActiveTab('orders');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: Heart,
      badge: wishlistCount > 0 ? wishlistCount : null,
      onClick: () => onOpenWishlist(),
    },
    {
      id: 'account',
      label: user ? 'Account' : 'Sign In',
      icon: UserIcon,
      onClick: () => {
        if (user) {
          setShowAccountSheet((s) => !s);
        } else {
          onSignIn();
        }
      },
    },
  ];
  // Before sign-in only Invites and Sign In are shown; the rest unlocks after login.
  const navItems = user ? allNavItems : allNavItems.filter((i) => i.id === 'invitations' || i.id === 'account');

  return (
    <>
      {/* Account Popup Sheet (when logged in and taps Account) */}
      {showAccountSheet && user && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full bg-[#1a0a14] border-t border-[#6b2140]/60 rounded-t-3xl p-5 shadow-2xl space-y-4 pb-24"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#6b2140]/40 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#b8336a] to-[#d4af37] flex items-center justify-center text-[#1a0a14] font-extrabold text-sm">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#fdf1f5] truncate">{user.name}</p>
                  <p className="text-xs text-[#cf9bb3] truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountSheet(false)}
                className="w-8 h-8 rounded-full bg-[#26101c] text-[#cf9bb3] flex items-center justify-center hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setShowAccountSheet(false);
                  openEventWizard();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c9a648] to-[#e85d8a] text-[#1a0a14] font-bold text-xs shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                + Create New Event
              </button>

              <button
                onClick={() => {
                  setShowAccountSheet(false);
                  setActiveTab('orders');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#26101c] border border-[#6b2140]/50 text-[#fdf1f5] font-semibold text-xs hover:border-[#d4af37]/40"
              >
                <ClipboardList className="w-4 h-4 text-[#e8c874]" />
                My Bookings & Invoices
              </button>

              <button
                onClick={() => {
                  setShowAccountSheet(false);
                  setActiveTab('events');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#26101c] border border-[#6b2140]/50 text-[#fdf1f5] font-semibold text-xs hover:border-[#d4af37]/40"
              >
                <Calendar className="w-4 h-4 text-[#e8c874]" />
                My Event Details & Budget
              </button>

              <button
                onClick={() => {
                  setShowAccountSheet(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs hover:bg-rose-500/25 mt-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="customer-bottom-nav fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#1a0a14]/95 backdrop-blur-xl border-t border-[#6b2140]/60 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] transition-transform duration-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-15 sm:h-16 max-w-lg mx-auto px-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center flex-1 basis-0 min-w-0 overflow-hidden h-full py-1 px-0.5 relative group transition-transform active:scale-95 select-none"
              >
                {/* Active Indicator Top Pill */}
                {isActive && (
                  <span className="absolute top-0 w-6 h-0.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f0c869] to-[#e85d8a] shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
                )}

                {/* Icon wrapper with optional notification badge */}
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-[#6b2140]/40 to-[#d4af37]/20 text-[#f0c869]'
                      : 'text-[#cf9bb3] group-hover:text-[#f0c869]'
                  }`}
                >
                  {item.customIcon ? (
                    item.customIcon
                  ) : IconComponent ? (
                    <IconComponent
                      className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform ${
                        isActive ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                    />
                  ) : null}

                  {/* Badge (e.g. for wishlist) */}
                  {item.badge != null && (
                    <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-gradient-to-r from-[#e85d8a] to-[#d4af37] text-[8px] font-extrabold text-[#1a0a14] flex items-center justify-center shadow-sm">
                      {item.badge}
                    </span>
                  )}

                  {/* User online indicator dot */}
                  {item.id === 'account' && user && (
                    <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#1a0a14]" />
                  )}
                </div>

                {/* Label */}
                <span
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  className={`text-[8px] min-[400px]:text-[9px] sm:text-[10px] tracking-tight font-semibold mt-0.5 w-full text-center [overflow-wrap:normal] [word-break:normal] transition-colors leading-[1.1] ${
                    isActive
                      ? 'text-[#f0c869] font-bold'
                      : 'text-[#cf9bb3] group-hover:text-[#fdf1f5]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
