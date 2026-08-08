import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight, ArrowLeft, Calendar as CalendarIcon, Users, IndianRupee, MapPin } from 'lucide-react';
import { Event } from '../shared/shared-types';
import { calculateBudgetBreakdown } from '../shared/shared-utils';

interface EventWizardModalProps {
  onClose: () => void;
  onEventCreated: (event: Event) => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({ onClose, onEventCreated }) => {
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('Wedding');
  const [title, setTitle] = useState('My Grand Celebration');
  const [city, setCity] = useState('Chennai');
  const [date, setDate] = useState('2026-12-15');
  const [guestCount, setGuestCount] = useState(350);
  const [totalBudget, setTotalBudget] = useState(500000);

  const budgetBreakdown = calculateBudgetBreakdown(eventType, totalBudget);

  const handleFinish = () => {
    const newEvent: Event = {
      id: `evt-${Date.now()}`,
      userId: 'usr-customer-1',
      title,
      eventType,
      date,
      location: { city },
      guestCount,
      totalBudget,
      spentBudget: 0,
      status: 'planning',
      budgetBreakdown,
      tasks: [
        { id: 't-1', title: 'Book Venue', category: 'Venue', completed: false, priority: 'high' },
        { id: 't-2', title: 'Finalize Feast Caterer', category: 'Catering', completed: false, priority: 'high' },
        { id: 't-3', title: 'Book Photographer', category: 'Photography', completed: false, priority: 'high' },
        { id: 't-4', title: 'Create Canva Digital Invitation', category: 'Invitation', completed: false, priority: 'medium' },
      ],
      schedule: [
        { id: 's-1', time: '10:00 AM', activity: 'Guest Arrival & Welcome Drinks' },
        { id: 's-2', time: '11:30 AM', activity: 'Main Event Ceremony' },
        { id: 's-3', time: '01:00 PM', activity: 'Feast Lunch' },
      ],
      bookedVendorIds: [],
      createdAt: new Date().toISOString(),
    };

    onEventCreated(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card max-w-2xl w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm text-white">Event Creation Wizard — Step {step} of 7</span>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Line */}
        <div className="h-1.5 bg-slate-900 w-full">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-300" style={{ width: `${(step / 7) * 100}%` }} />
        </div>

        {/* Body Steps */}
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

              <div className="grid grid-cols-2 gap-3">
                {['Chennai', 'Coimbatore', 'Madurai', 'Bangalore'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-between transition-all ${
                      city === c
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{c}</span>
                    <MapPin className="w-4 h-4" />
                  </button>
                ))}
              </div>
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
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  step={25000}
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
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1"
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1 hover:scale-105 transition-all"
            >
              <Check className="w-4 h-4" /> Launch Event Plan
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
