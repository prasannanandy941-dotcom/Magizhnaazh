import React, { useEffect, useState } from 'react';
import { Loader2, Plus, ChevronDown, Check } from 'lucide-react';
import { Category } from '../../../../packages/shared-types';
import { fetchCategories, addCategory, deleteCategory } from '../api';
import { DeleteButton } from './CrudListPanel';

// The options each customer-facing category exposes (mirrors localhost:3000).
const CATEGORY_OPTIONS: Record<string, string[]> = {
  Venue: [
    'AC room', 'Fans only', 'VIP room', 'VIP front chairs', 'Garlands', 'Bride and groom room',
    'Guest rooms', 'Dormitory hall', 'Separate guest washroom', 'Water filter', 'Cooking utensils',
    'Catering included', 'Decoration', 'DJ available', 'Transport',
  ],
  Catering: ['Vegetarian', 'Non-Vegetarian', 'Starters', 'Desserts', 'Mocktails & Ice Cream'],
  Media: [
    'Candid Photography', 'Traditional Photography', 'Pre-Wedding Shoot', 'Post-Wedding Shoot',
    'Cinematic Films', 'Candid Videography', 'Traditional Videography', 'Drone Coverage',
    'Live Streaming', 'Same-Day Edit', 'Highlight Reel', 'Full-Length Edit', 'LED Screens',
  ],
  Decoration: [
    'South Indian Traditional', 'Royal Mandap', 'Reception Stage', 'Haldi & Mehndi',
    'Christian Wedding', 'Garlands & Floral Strings', 'Birthday & Baby Shower',
  ],
  'Makeup & Beauty': [
    'Bridal Makeup', 'Reception & Engagement', 'Party & Guest', 'Haldi & Mehndi',
    'Hair & Saree Draping', 'Ornaments & Jewellery', 'Pre-Bridal Skin & Hair',
  ],
  Transport: ['Airport Pickup', 'Railway Station Pickup', 'Bride & Groom Vehicle', 'Guest Vehicle', 'Bus Stop Pickup'],
  'Pujari/Priest': [
    'Wedding (Vivaham)', 'Engagement (Nichayam)', 'Griha Pravesh', 'Naming & Cradle',
    'Seemantham (Baby Shower)', 'Satyanarayan & Homam', 'Upanayanam',
  ],
  'Return Gifts': [
    'Traditional (Silver & Brass)', 'Sweets & Dry Fruits', 'Eco-Friendly Plants',
    'Personalized Gifts', 'Hampers & Favors', 'Kids Gifts',
  ],
  'Music/DJ': [
    'DJ Package', 'Live Band', 'Anchor / MC', 'Sound & Lighting Setup',
    'Nadaswaram & Thavil', 'Dhol & Band Baaja', 'Carnatic / Classical', 'Bhajan / Devotional',
  ],
  Cleaning: ['Pre-event Cleaning', 'Post-event Cleaning', 'Washroom Attendants', 'Waste Management', 'Deep Cleaning', 'Housekeeping Staff'],
  'Corporate Event Services': ['Conference Setup', 'Registration Desk', 'AV & Projection', 'Stage & Podium', 'Corporate Catering', 'Branding & Standees'],
  Entertainment: ['Dance Troupe', 'Magician', 'Stand-up Comedy', 'Celebrity Performer', 'Fireworks', 'Fun Zone / Games'],
  'Event Host/Anchor': ['Wedding Anchor', 'Corporate Emcee', 'Bilingual Host', 'Kids Show Host', 'Sangeet Host', 'Voice-over Artist'],
  Flowers: ['Fresh Flower Decor', 'Garlands (Maalai)', 'Bouquets', 'Floral Backdrops', 'Rose Petals', 'Mandap Flowers'],
  Invitation: ['Printed Cards', 'Digital / E-Invites', 'Video Invitations', 'Caricature Invites', 'Wedding Website', 'Save the Date'],
  Lighting: ['Fairy Lights', 'LED Par Lights', 'Gobo / Monogram', 'Chandeliers', 'Uplighting', 'Laser & Effects'],
  Mehendi: ['Bridal Mehendi', 'Arabic Design', 'Rajasthani Design', 'Guest Mehendi', 'Glitter / Colour Mehendi', 'Nail Art'],
  Printing: ['Wedding Cards', 'Banners & Flex', 'Photo Albums', 'Standees', 'Menu Cards', 'Thank-you Cards'],
  'Rental Equipment': ['Chairs & Tables', 'Tents & Canopy', 'Sound System', 'Generators / Power', 'Crockery & Cutlery', 'Cooling / Fans'],
  Security: ['Bouncers', 'Gate Security', 'Valet Coordination', 'CCTV Surveillance', 'Crowd Management', 'VIP Protection'],
  'Wedding Planner': ['Full Wedding Planning', 'Day Coordination', 'Budget Management', 'Vendor Management', 'Destination Wedding', 'Theme Design'],
  Other: ['Custom Service', 'Add-on Service', 'Miscellaneous'],
};

const SELECTED_KEY = 'magizh_admin_category_options';
const loadSelected = (): Record<string, string[]> => {
  try {
    return JSON.parse(localStorage.getItem(SELECTED_KEY) || '{}');
  } catch {
    return {};
  }
};

export const CategoriesTab: React.FC<{ token: string }> = ({ token }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>(loadSelected);

  const isPicked = (catId: string, option: string) => (selected[catId] || []).includes(option);
  const toggleOption = (catId: string, option: string) => {
    setSelected((prev) => {
      const cur = prev[catId] || [];
      const next = cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option];
      const updated = { ...prev, [catId]: next };
      try {
        localStorage.setItem(SELECTED_KEY, JSON.stringify(updated));
      } catch {
        /* ignore storage errors */
      }
      return updated;
    });
  };

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetchCategories();
    setCategories(res.data?.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addCategory(token, name.trim());
      setName('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Vendor Categories</h2>
        <p className="text-slate-400 text-sm mt-1">
          Categories available for vendors to list themselves under. Click a category to view its options.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category Name</label>
          <input
            type="text"
            placeholder="e.g. Fireworks"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Category
        </button>
        {error && <p className="w-full text-xs text-rose-400">{error}</p>}
      </form>

      {/* List */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No categories yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {categories.map((c) => {
              const options = CATEGORY_OPTIONS[c.name] ?? [];
              const isOpen = expandedId === c.id;
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between gap-3 p-4 hover:bg-slate-900/40">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : c.id)}
                      className="flex items-center gap-2.5 text-left min-w-0"
                    >
                      <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      <span className="font-bold text-white truncate">{c.name}</span>
                      {options.length > 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                          {(selected[c.id]?.length ?? 0) > 0 ? `${selected[c.id].length}/${options.length} selected` : `${options.length} options`}
                        </span>
                      )}
                    </button>
                    <DeleteButton
                      busy={busyId === c.id}
                      onClick={async () => {
                        setBusyId(c.id);
                        await deleteCategory(token, c.id);
                        await load();
                        setBusyId(null);
                      }}
                    />
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pl-11">
                      {options.length > 0 ? (
                        <>
                          <p className="text-[11px] text-slate-500 mb-2">Tap an option to select / deselect it.</p>
                          <div className="flex flex-wrap gap-2">
                            {options.map((o) => {
                              const picked = isPicked(c.id, o);
                              return (
                                <button
                                  key={o}
                                  type="button"
                                  onClick={() => toggleOption(c.id, o)}
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    picked
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:text-white'
                                  }`}
                                >
                                  {picked && <Check className="w-3 h-3" />}
                                  {o}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">No options configured for this category yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
