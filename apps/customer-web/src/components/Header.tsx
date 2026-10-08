import React, { useState, useEffect, useRef } from 'react';
import { ThemeToggle } from '../../../../packages/shared-ui/theme';
import { LanguageButton } from '../../../../packages/shared-ui/i18n/react';
import { Sparkles, Calendar, Heart, Store, User as UserIcon, LogIn, LogOut, ChevronDown, ClipboardList, Menu, X } from 'lucide-react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState({ hasOverflow: false, thumbWidthPercent: 100, scrollFraction: 0 });

  const updateScrollProgress = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const hasOverflow = maxScroll > 6;
      const thumbRatio = clientWidth / Math.max(1, scrollWidth);
      const thumbWidthPercent = Math.max(20, Math.min(100, Math.round(thumbRatio * 100)));
      const scrollFraction = maxScroll > 0 ? Math.max(0, Math.min(1, scrollLeft / maxScroll)) : 0;
      setScrollProgress({ hasOverflow, thumbWidthPercent, scrollFraction });
    }
  };

  useEffect(() => {
    updateScrollProgress();
    const handleResize = () => updateScrollProgress();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      const activeEl = navRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      setTimeout(updateScrollProgress, 300);
    }
  }, [activeTab]);

  const handleWheel = (e: React.WheelEvent) => {
    if (navRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      navRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!navRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const maxScroll = navRef.current.scrollWidth - navRef.current.clientWidth;
    navRef.current.scrollTo({ left: fraction * maxScroll, behavior: 'smooth' });
  };

  // Shared nav definition, used by both the desktop bar and the mobile menu.
  const allNavItems: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'marketplace', label: 'Marketplace', icon: <Store className="w-4 h-4" /> },
    { id: 'events', label: 'My Events', icon: <Calendar className="w-4 h-4" /> },
    { id: 'budget', label: 'Smart Budget', icon: <span className="font-bold text-[#e8c874]">₹</span> },
    { id: 'invitations', label: 'Canva Invites', icon: <Sparkles className="w-4 h-4 text-[#f0c869]" /> },
    { id: 'guests', label: 'Guests & RSVP', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'orders', label: 'My Orders', icon: <ClipboardList className="w-4 h-4" /> },
  ];
  // Before sign-in a visitor only sees Canva Invites; everything else unlocks after login.
  const navItems = user ? allNavItems : allNavItems.filter((i) => i.id === 'invitations');

  return (
    <header className="sticky top-0 z-50 border-b border-[#6b2140]/50 bg-[#1a0a14]/85 backdrop-blur-xl">
      <div className="customer-header-row max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex min-w-0 items-center justify-between gap-2 sm:gap-4">
        
        {/* Logo & Brand Name */}
        <div 
          onClick={() => setActiveTab(user ? 'marketplace' : 'invitations')}
          className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#b8336a] via-[#c9a648] to-[#f0c869] flex items-center justify-center shadow-md shadow-[#d4af37]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-[#1a0a14]" />
          </div>
          <div className="customer-header-brand-copy min-w-0 flex flex-col justify-center">
            <span className="block whitespace-nowrap font-display font-extrabold text-lg sm:text-2xl tracking-tight text-[#fdf1f5] group-hover:text-[#e8c874] transition-colors leading-tight">
              Magizhnaazh
            </span>
            <span className="customer-header-subtitle block whitespace-nowrap text-[8px] sm:text-[10px] uppercase font-bold tracking-[0.1em] sm:tracking-widest text-[#e8c874] font-sans leading-none mt-0.5">
              Customer Event Planner
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="customer-desktop-navigation hidden md:flex min-w-0 flex-1 flex-col bg-[#26101c]/70 rounded-2xl border border-[#6b2140]/60 overflow-hidden max-w-xl xl:max-w-2xl ml-3 mr-2">
          <nav
            ref={navRef}
            onScroll={updateScrollProgress}
            onWheel={handleWheel}
            className="flex items-center gap-1 p-1.5 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`whitespace-nowrap shrink-0 px-3 xl:px-4 py-2 rounded-xl font-medium text-xs xl:text-sm transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md font-semibold'
                      : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Dedicated visible scrolling line — clean, properly padded, never cut in half */}
          {scrollProgress.hasOverflow && (
            <div
              onClick={handleTrackClick}
              className="px-3 pb-2 pt-0.5 cursor-pointer group/track"
              title="Click or scroll to navigate tabs"
            >
              <div className="h-1.5 w-full bg-[#6b2140]/40 group-hover/track:bg-[#6b2140]/70 rounded-full overflow-hidden transition-colors relative">
                <div
                  className="h-full bg-gradient-to-r from-[#c9a648] via-[#e85d8a] to-[#c9a648] rounded-full transition-[margin] duration-100 shadow-sm shadow-[#c9a648]/40"
                  style={{
                    width: `${scrollProgress.thumbWidthPercent}%`,
                    marginLeft: `${scrollProgress.scrollFraction * (100 - scrollProgress.thumbWidthPercent)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right CTA / Controls */}
        <div className="customer-header-actions flex shrink-0 items-center gap-2 sm:gap-2.5">
          <button
            onClick={openEventWizard}
            className="customer-header-create-event shine-sweep hidden sm:flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] via-[#c9a648] to-[#e85d8a] hover:from-[#f0c869] hover:to-[#f2a6c4] text-[#1a0a14] font-bold text-xs shadow-lg shadow-[#d4af37]/25 transition-all hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create Event
          </button>

          {/* Language Button - neatly adjusted */}
          <LanguageButton
            hideLabelOnMobile={true}
            className="shrink-0"
            buttonClassName="customer-mobile-language-button bg-[#26101c] border border-[#6b2140]/60 text-[#f5c9dc] hover:border-[#d4af37]/50 w-9 h-9 sm:w-auto p-0 sm:px-2.5 sm:py-2 flex items-center justify-center rounded-xl"
          />

          {/* Theme Toggle - neatly adjusted */}
          <ThemeToggle app="customer" className="customer-header-theme-toggle w-9 h-9 sm:w-10 sm:h-10 rounded-xl" />

          {/* Wishlist Button - desktop only (available in bottom nav on mobile) */}
          <button
            onClick={onOpenWishlist}
            className="customer-header-wishlist hidden md:flex relative w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-[#26101c] border border-[#6b2140]/60 text-[#cf9bb3] hover:text-[#f0c869] hover:border-[#d4af37]/50 transition-colors"
            title="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#b8860b] text-[#1a0a14] text-[11px] font-bold flex items-center justify-center animate-pulse">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Sign In / User Menu - desktop only (available in bottom nav on mobile) */}
          {user ? (
            <div className="customer-header-user-menu hidden md:block relative shrink-0">
              <button
                onClick={() => setShowUserMenu((s) => !s)}
                className="flex items-center justify-center sm:pl-2 sm:pr-3 sm:py-2 rounded-xl bg-[#26101c] border border-[#6b2140]/60 hover:border-[#d4af37]/40 transition-colors"
                title={user.name}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#b8336a] to-[#f0c869] flex items-center justify-center text-[#1a0a14] font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-xs font-bold text-[#fdf1f5] max-w-[100px] truncate ml-2">{user.name}</span>
                <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-[#cf9bb3] ml-1" />
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
              className="customer-header-sign-in hidden md:flex items-center justify-center gap-2 px-4 py-2.5 shrink-0 rounded-xl bg-[#26101c] border border-[#6b2140]/60 hover:border-[#d4af37]/50 text-[#f5c9dc] font-bold text-xs transition-colors"
              title="Sign In"
              aria-label="Sign In"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile menu toggle (shown < md, where the desktop nav is hidden) */}
          <button
            onClick={() => setShowMobileMenu((s) => !s)}
            className="customer-mobile-menu-toggle md:hidden shrink-0 w-8.5 h-8.5 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#26101c] border border-[#6b2140]/60 text-[#cf9bb3] hover:text-[#f0c869] transition-colors"
            aria-label="Menu"
            aria-expanded={showMobileMenu}
            aria-controls="customer-mobile-navigation"
            type="button"
          >
            {showMobileMenu ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile navigation menu */}
      {showMobileMenu && (
        <nav id="customer-mobile-navigation" className="customer-mobile-navigation md:hidden border-t border-[#6b2140]/50 bg-[#1a0a14]/95 backdrop-blur-xl px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] shadow-md'
                  : 'text-[#cf9bb3] hover:text-[#e8c874] hover:bg-[#6b2140]/30'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button
            onClick={() => { openEventWizard(); setShowMobileMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c9a648] to-[#e85d8a] text-[#1a0a14] font-bold text-sm shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            + Create Event
          </button>

          {user ? (
            <div className="pt-2 border-t border-[#6b2140]/40 flex items-center justify-between px-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#fdf1f5] truncate">{user.name}</p>
                <p className="text-[11px] text-[#cf9bb3] truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { setShowMobileMenu(false); onLogout(); }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#6b2140]/40">
              <button
                onClick={() => { setShowMobileMenu(false); onSignIn(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#26101c] border border-[#6b2140]/60 text-[#f5c9dc] font-bold text-xs hover:border-[#d4af37]/50"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
};