import React, { useState } from 'react';
import { Sparkles, Calendar, Heart, Store, User as UserIcon, LogIn, LogOut, ChevronDown, ClipboardList } from 'lucide-react';
import { User } from '../../../../packages/shared-types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  wishlistCount: number;
  onOpenWishlist: () => void;
  openEventWizard: () => void;
  user: User | null;
  onSignIn: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  wishlistCount,
  onOpenWishlist,
  openEventWizard,
  user,
  onSignIn,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[#6b2140]/50 bg-[#1a0a14]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div 
          onClick={() => setActiveTab('marketplace')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#b8336a] via-[#c9a648] to-[#f0c869] flex items-center justify-center shadow-lg shadow-[#d4af37]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-[#1a0a14]" />
          </div>
          <div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-[#fdf1f5] group-hover:text-[#e8c874] transition-colors">
              Magizhnaazh
            </span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-[#e8c874] font-sans">
              Customer Event Planner
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-[#26101c]/70 p-1.5 rounded-2xl border border-[#6b2140]/60">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'marketplace'
                ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md'
                : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
            }`}
          >
            <Store className="w-4 h-4" />
            Marketplace
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'events'
                ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md'
                : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Events
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'budget'
                ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md'
                : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
            }`}
          >
            <span className={`font-bold ${activeTab === 'budget' ? 'text-[#1a0a14]' : 'text-[#e8c874]'}`}>₹</span>
            Smart Budget
          </button>

          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'invitations'
                ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md'
                : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'invitations' ? 'text-[#1a0a14]' : 'text-[#f0c869]'}`} />
            Canva Invites
          </button>

          <button
            onClick={() => setActiveTab('guests')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'guests'
                ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md'
                : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Guests & RSVP
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md'
                : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            My Orders
          </button>

        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={openEventWizard}
            className="shine-sweep hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c9a648] to-[#e85d8a] hover:from-[#f0c869] hover:to-[#f2a6c4] text-[#1a0a14] font-bold text-sm shadow-lg shadow-[#d4af37]/25 transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            + Create Event
          </button>

          <button
            onClick={onOpenWishlist}
            className="relative p-2.5 rounded-xl bg-[#26101c] border border-[#6b2140]/60 text-[#cf9bb3] hover:text-[#f0c869] hover:border-[#d4af37]/50 transition-colors"
            title="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#b8860b] text-[#1a0a14] text-[11px] font-bold flex items-center justify-center animate-pulse">
                {wishlistCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((s) => !s)}
                className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl bg-[#26101c] border border-[#6b2140]/60 hover:border-[#d4af37]/40 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#b8336a] to-[#f0c869] flex items-center justify-center text-[#1a0a14] font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-xs font-bold text-[#fdf1f5] max-w-[100px] truncate">{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#cf9bb3]" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#26101c] border border-[#6b2140]/60 shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#6b2140]/60">
                    <p className="text-xs font-bold text-[#fdf1f5] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#cf9bb3] truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-400 hover:bg-[#6b2140]/40 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#26101c] border border-[#6b2140]/60 hover:border-[#d4af37]/50 text-[#f5c9dc] font-bold text-xs transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>

      </div>
    </header>
  );
};