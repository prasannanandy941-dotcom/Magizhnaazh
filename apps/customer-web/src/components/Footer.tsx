import React, { useState } from 'react';
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Zap,
  CreditCard,
  X,
  ExternalLink,
  Info,
  Briefcase,
  HelpCircle,
  RotateCcw,
  Newspaper,
  HeartHandshake,
} from 'lucide-react';

interface FooterProps {
  onNavigateTab: (tab: string) => void;
  openEventWizard?: () => void;
  onOpenSignIn?: () => void;
}

type ModalType = 'about' | 'careers' | 'blog' | 'press' | 'help' | 'returns' | null;

export const Footer: React.FC<FooterProps> = ({
  onNavigateTab,
  openEventWizard,
  onOpenSignIn,
}) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

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
                <button
                  type="button"
                  onClick={() => setActiveModal('about')}
                  className="hover:text-[#f0c869] transition-colors"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('careers')}
                  className="hover:text-[#f0c869] transition-colors"
                >
                  Careers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('blog')}
                  className="hover:text-[#f0c869] transition-colors"
                >
                  Blog &amp; News
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('press')}
                  className="hover:text-[#f0c869] transition-colors"
                >
                  Press
                </button>
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
                <button
                  type="button"
                  onClick={() => setActiveModal('help')}
                  className="hover:text-[#f0c869] transition-colors"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal('returns')}
                  className="hover:text-[#f0c869] transition-colors"
                >
                  Returns &amp; Refunds
                </button>
              </li>
              <li>
                <a
                  href="/privacy.html"
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
                  href="/terms.html"
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

      {/* Informational Modal for Footer Links */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1f0d19] border border-[#6b2140] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-left relative">
            
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[#cf9bb3] hover:text-[#fdf1f5] hover:bg-[#6b2140]/30 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'about' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#c9a648]/20 flex items-center justify-center text-[#e8c874]">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#fdf1f5]">About Magizhnaazh</h3>
                    <p className="text-xs text-[#e8c874] font-semibold">Operated by Porulon Technologies Private Limited</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-[#cf9bb3] space-y-3 leading-relaxed">
                  <p>
                    <strong>Magizhnaazh</strong> is Tamil Nadu&apos;s all-in-one celebration and event planning marketplace, headquartered in Coimbatore, Tamil Nadu.
                  </p>
                  <p>
                    From finding premier wedding venues, caterers, makeup artists, and photographers to intelligent budget planning and interactive RSVP invitations, Magizhnaazh simplifies every step of hosting your dream event.
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#26101c] border border-[#6b2140]/60 space-y-1.5 text-xs">
                    <div className="font-semibold text-[#fdf1f5]">Porulon Technologies Private Limited</div>
                    <div className="text-[#e8c874]">Coimbatore, Tamil Nadu, India</div>
                    <div>Email: porulontechnologies@gmail.com</div>
                    <div>Phone: +91 90470 99277</div>
                  </div>
                </div>
              </>
            )}

            {activeModal === 'careers' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#b8336a]/20 flex items-center justify-center text-[#e85d8a]">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#fdf1f5]">Careers at Porulon</h3>
                    <p className="text-xs text-[#e85d8a] font-semibold">Shape the Future of Event Technology</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-[#cf9bb3] space-y-3 leading-relaxed">
                  <p>
                    We are building cutting-edge event tech and vendor marketplace solutions for celebrations across India.
                  </p>
                  <p>
                    We are always looking for enthusiastic software engineers, designers, vendor relationship managers, and event operations specialists.
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#26101c] border border-[#6b2140]/60 text-xs">
                    <p className="text-[#fdf1f5] font-semibold mb-1">Send us your CV / Portfolio:</p>
                    <a href="mailto:porulontechnologies@gmail.com" className="text-[#e8c874] underline">
                      porulontechnologies@gmail.com
                    </a>
                  </div>
                </div>
              </>
            )}

            {activeModal === 'blog' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#c9a648]/20 flex items-center justify-center text-[#e8c874]">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#fdf1f5]">Blog &amp; Celebration News</h3>
                    <p className="text-xs text-[#e8c874] font-semibold">Tips, Trends &amp; Planning Guides</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-[#cf9bb3] space-y-3 leading-relaxed">
                  <p>
                    Discover the latest wedding trends, floral stage concepts, curated traditional catering menus, and smart budget allocation guides.
                  </p>
                  <p>
                    Explore our vendor spotlight stories showcasing top artisans, venues, and decorators from across Coimbatore, Chennai, Madurai, and beyond.
                  </p>
                </div>
              </>
            )}

            {activeModal === 'press' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#c9a648]/20 flex items-center justify-center text-[#e8c874]">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#fdf1f5]">Press &amp; Media Inquiries</h3>
                    <p className="text-xs text-[#e8c874] font-semibold">Media Relations &amp; Brand Assets</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-[#cf9bb3] space-y-3 leading-relaxed">
                  <p>
                    For press releases, interview requests, media coverage, or partnership opportunities, reach out directly to our communications desk.
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#26101c] border border-[#6b2140]/60 text-xs">
                    <p className="text-[#fdf1f5] font-semibold mb-1">Press Inquiries:</p>
                    <a href="mailto:porulontechnologies@gmail.com" className="text-[#e8c874] underline">
                      porulontechnologies@gmail.com
                    </a>
                  </div>
                </div>
              </>
            )}

            {activeModal === 'help' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#fdf1f5]">Customer Help Center</h3>
                    <p className="text-xs text-emerald-400 font-semibold">We&apos;re Here to Help You Celebrate</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-[#cf9bb3] space-y-3 leading-relaxed">
                  <p>
                    Have questions about booking a vendor, paying advances, or managing your event guestlist? Our dedicated support team is available to assist you.
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#26101c] border border-[#6b2140]/60 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#e8c874]" />
                      <a href="tel:+919047099277" className="text-[#e8c874] font-semibold hover:underline">
                        +91 90470 99277
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#e8c874]" />
                      <a href="mailto:porulontechnologies@gmail.com" className="text-[#e8c874] font-semibold hover:underline">
                        porulontechnologies@gmail.com
                      </a>
                    </div>
                    <div className="text-[#cf9bb3] pt-1">
                      Support Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeModal === 'returns' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#fdf1f5]">Returns &amp; Refunds Policy</h3>
                    <p className="text-xs text-sky-400 font-semibold">Fair &amp; Transparent Terms</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-[#cf9bb3] space-y-3 leading-relaxed">
                  <p>
                    Magizhnaazh ensures transparent booking policies between customers and service vendors:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Advance payments are held securely until booking confirmation by the selected vendor.</li>
                    <li>If a vendor is unavailable on your requested date, any advance paid is promptly refunded or reallocated.</li>
                    <li>Cancellations are handled according to the vendor agreement agreed upon during quote confirmation.</li>
                  </ul>
                  <p className="pt-2 text-xs">
                    Need refund assistance? Email us at{' '}
                    <a href="mailto:porulontechnologies@gmail.com" className="text-[#e8c874] underline">
                      porulontechnologies@gmail.com
                    </a>{' '}
                    with your Booking ID.
                  </p>
                </div>
              </>
            )}

            <div className="pt-3 border-t border-[#6b2140]/60 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] font-bold text-xs shadow-md hover:brightness-110"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </footer>
  );
};
