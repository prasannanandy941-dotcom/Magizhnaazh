import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight, ArrowLeft, MapPin, Search, Loader2 } from 'lucide-react';
import { Event } from '../../../../packages/shared-types';
import { calculateBudgetBreakdown, ALL_INDIA_CITIES } from '../../../../packages/shared-utils';
import { createEvent } from '../api';

interface EventWizardModalProps {
  onClose: () => void;
  onEventCreated: (event: Event) => void;
}

// Full catalogue of cities across every Indian state & UT (shared with the
// marketplace and hero search so all three surfaces stay in sync).
const UNIQUE_CITIES = ALL_INDIA_CITIES;

export const EventWizardModal: React.FC<EventWizardModalProps> = ({ onClose, onEventCreated }) => {
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('Wedding');
  const [title, setTitle] = useState('My Grand Celebration');
  const [city, setCity] = useState('Chennai');
  const [citySearch, setCitySearch] = useState('');
  const [date, setDate] = useState('2026-12-15');
  const [guestCount, setGuestCount] = useState(350);
  const [totalBudget, setTotalBudget] = useState(500000);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Client-side preview only — the server recalculates and persists the real breakdown.
  const budgetBreakdown = calculateBudgetBreakdown(eventType, totalBudget);

  const filteredCities = citySearch.trim()
    ? UNIQUE_CITIES.filter((c) =>
        c.toLowerCase().includes(citySearch.trim().toLowerCase())
      )
    : UNIQUE_CITIES;

  const handleFinish = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await createEvent({
        title,
        eventType,
        city,
        date,
        guestCount,
        totalBudget,
      });

      if (!res.success || !res.data?.event) {
        throw new Error(res.message || 'Failed to create event.');
      }

      onEventCreated(res.data.event);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card max-w-2xl w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm text-white">Event Creation Wizard — Step {step} of 7</span>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-1.5 bg-slate-900 w-full">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-300" style={{ width: `${(step / 7) * 100}%` }} />
        </div>

        <div className="p-6 sm:p-8 flex-1 min-h-[320px]">
          {step === 1 && (
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Select Event Type</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">Choose the type of celebration you are planning</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['Wedding', 'Birthday', 'Engagement', 'Anniversary', 'Baby Shower', 'Corporate Event'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setEventType(type)}
                    className={`p-4 rounded-2xl border font-bold text-xs transition-all ${
                      eventType === type
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Event Title</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">Give your event a memorable title</p>
              
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Felix & Priya Wedding"
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Select Location</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">Where will your event take place?</p>

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search any city in India..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {filteredCities.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {filteredCities.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-between transition-all ${
                        city === c
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{c}</span>
                      <MapPin className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No cities found matching "{citySearch}"
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Select Event Date</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">Choose your planned event date</p>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Expected Guest Count</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">How many attendees are you expecting?</p>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={20}
                  max={2000}
                  step={20}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-2xl font-bold text-amber-400 w-24 text-right">{guestCount}</span>
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Set Total Budget</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">Specify your overall target budget in INR (₹)</p>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-2xl font-bold text-emerald-400">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totalBudget === 0 ? '' : totalBudget}
                  onChange={(e) => {
                    // Keep digits only, then strip any leading zeros
                    const digitsOnly = e.target.value.replace(/\D/g, '');
                    const noLeadingZeros = digitsOnly.replace(/^0+(?=\d)/, '');
                    setTotalBudget(noLeadingZeros === '' ? 0 : Number(noLeadingZeros));
                  }}
                  placeholder="0"
                  className="w-full bg-transparent text-white font-bold text-2xl focus:outline-none"
                />
              </div>

              <div className="mt-4 text-xs text-slate-400">
                Formatted: <span className="text-amber-400 font-bold">₹{(totalBudget / 100000).toFixed(2)} Lakhs</span>
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Smart Budget Preview</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Our smart engine automatically partitioned your <span className="text-amber-400 font-bold">₹{totalBudget.toLocaleString('en-IN')}</span> budget:
              </p>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {budgetBreakdown.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{item.category} ({item.allocatedPercentage}%)</span>
                    <span className="font-bold text-amber-400">₹{item.allocatedAmount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {submitError && (
                <p className="mt-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 7 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md flex items-center gap-1"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1 hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Launch Event Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};