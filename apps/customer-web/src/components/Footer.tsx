import React from 'react';
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Zap,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

interface FooterProps {
  onNavigateTab: (tab: string) => void;
  openEventWizard?: () => void;
  onOpenSignIn?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateTab }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabClick = (tabId: string) => {
    onNavigateTab(tabId);
    scrollToTop();
  };

  return (
    <footer className="relative z-20 bg-[#0d040a]/95 border-t border-[#6b2140]/60 text-[#fdf1f5] pt-14 pb-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid: 1 brand column + 2 link columns (Company & Support) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 pb-12">
          
          {/* Brand & Company Details Column (takes 2 columns on desktop) */}
          <div className="sm:col-span-2 md:col-span-2 space-y-4">
            {/* Logo */}
            <div 
              onClick={() => handleTabClick('marketplace')}
              className="inline-flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#b8336a] via-[#c9a648] to-[#f0c869] flex items-center justify-center shadow-lg shadow-[#d4af37]/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-[#1a0a14]" />
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-[#fdf1f5] group-hover:text-[#e8c874] transition-colors">
                Magizhnaazh
              </span>
            </div>

            {/* Tagline */}
            <p className="text-xs sm:text-sm text-[#cf9bb3] leading-relaxed max-w-sm">
              India&apos;s favourite event planning destination. Venues, catering, photography, decor &amp; more — delivered to your celebration.
            </p>

            {/* Legal Company Information */}
            <div className="pt-2 space-y-2.5">
              <div className="font-bold text-xs tracking-wider uppercase text-[#fdf1f5]">
                PORULON TECHNOLOGIES PRIVATE LIMITED
              </div>

              <div className="space-y-2 text-xs text-[#cf9bb3]">
                {/* Phone */}
                <a
                  href="tel:+919047099277"
                  className="flex items-center gap-2.5 hover:text-[#e8c874] transition-colors group"
                >
                  <Phone className="w-3.5 h-3.5 text-[#e8c874] group-hover:scale-110 transition-transform" />
                  <span>+91 90470 99277</span>
                </a>

                {/* Email */}
                <a
                  href="mailto:porulontechnologies@gmail.com"
                  className="flex items-center gap-2.5 hover:text-[#e8c874] transition-colors group"
                >
                  <Mail className="w-3.5 h-3.5 text-[#e8c874] group-hover:scale-110 transition-transform" />
                  <span>porulontechnologies@gmail.com</span>
                </a>

                {/* Location */}
                <a
                  href="https://maps.google.com/?q=Coimbatore,+Tamil+Nadu,+India"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 hover:text-[#e8c874] transition-colors group"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#e8c874] group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span>Coimbatore, Tamil Nadu, India</span>
                </a>
              </div>
            </div>
          </div>

          {/* Column 1: Company */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#fdf1f5] tracking-wide">
              Company
            </h3>
            <ul className="space-y-2.5 text-xs text-[#cf9bb3]">
              <li>
                <a
                  href="about.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  About Us
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="careers.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  Careers
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="blog.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  Blog &amp; News
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="press.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  Press
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Support */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#fdf1f5] tracking-wide">
              Support
            </h3>
            <ul className="space-y-2.5 text-xs text-[#cf9bb3]">
              <li>
                <a
                  href="help.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  Help Center
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="returns.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  Returns &amp; Refunds
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  Privacy Policy
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#f0c869] transition-colors"
                >
                  Terms of Service
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Trust Badges (Left) and Payment Methods (Right) */}
        <div className="border-t border-[#6b2140]/40 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-[#cf9bb3]">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Checkout</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Zap className="w-4 h-4 text-[#e8c874]" />
              <span>Fast Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>Easy Payments</span>
            </div>
          </div>

          {/* Accepted Payment Methods */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
            <span className="text-xs text-[#cf9bb3] mr-1">We accept:</span>
            <span className="px-2.5 py-1 rounded bg-[#26101c] border border-[#6b2140]/70 text-[11px] font-semibold tracking-wide text-[#fdf1f5] shadow-sm">
              UPI
            </span>
            <span className="px-2.5 py-1 rounded bg-[#26101c] border border-[#6b2140]/70 text-[11px] font-semibold tracking-wide text-[#fdf1f5] shadow-sm">
              Visa
            </span>
            <span className="px-2.5 py-1 rounded bg-[#26101c] border border-[#6b2140]/70 text-[11px] font-semibold tracking-wide text-[#fdf1f5] shadow-sm">
              Mastercard
            </span>
            <span className="px-2.5 py-1 rounded bg-[#26101c] border border-[#6b2140]/70 text-[11px] font-semibold tracking-wide text-[#fdf1f5] shadow-sm">
              RuPay
            </span>
            <span className="px-2.5 py-1 rounded bg-[#26101c] border border-[#6b2140]/70 text-[11px] font-semibold tracking-wide text-[#fdf1f5] shadow-sm">
              Net Banking
            </span>
          </div>

        </div>

        {/* Copyright notice */}
        <div className="mt-6 pt-4 border-t border-[#6b2140]/20 text-center text-[11px] text-[#cf9bb3]/70">
          © {new Date().getFullYear()} Porulon Technologies Private Limited · Magizhnaazh. All rights reserved.
        </div>

      </div>
    </footer>
  );
};
