import React, { useState } from 'react';
import { Star, MessageSquare, Send, Sparkles, QrCode, CheckCircle2 } from 'lucide-react';
import { EventFeedback } from '../shared/shared-types';

interface FeedbackModuleProps {
  feedbackList: EventFeedback[];
  onAddFeedback: (fb: EventFeedback) => void;
}

export const FeedbackModule: React.FC<FeedbackModuleProps> = ({ feedbackList, onAddFeedback }) => {
  const [showPublicForm, setShowPublicForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [overallRating, setOverallRating] = useState(5);
  const [venueRating, setVenueRating] = useState(5);
  const [cateringRating, setCateringRating] = useState(5);
  const [decorationRating, setDecorationRating] = useState(5);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFb: EventFeedback = {
      id: `fb-${Date.now()}`,
      eventId: 'evt-101',
      feedbackToken: 'fb-wed-felix-2026',
      guestName: guestName || 'Anonymous Guest',
      overallRating,
      venueRating,
      cateringRating,
      decorationRating,
      comments,
      createdAt: new Date().toISOString(),
    };

    onAddFeedback(newFb);
    setSubmitted(true);
  };

  const avgOverall = feedbackList.length
    ? (feedbackList.reduce((acc, f) => acc + f.overallRating, 0) / feedbackList.length).toFixed(1)
    : '5.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Public Feedback QR Link Generator
          </div>
          <h2 className="font-display font-bold text-3xl text-white">Event Feedback Collection</h2>
          <p className="text-slate-400 text-sm mt-1">
            Collect anonymous ratings and comments from attendees for venue, food, and decor.
          </p>
        </div>

        <button
          onClick={() => setShowPublicForm(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" /> Open Guest Feedback Form
        </button>
      </div>

      {/* Summary Score Card */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex flex-col items-center justify-center">
            <span className="font-display font-extrabold text-3xl text-amber-400">{avgOverall}</span>
            <span className="text-[10px] text-amber-300 uppercase font-bold">Overall Rating</span>
          </div>

          <div>
            <h3 className="font-bold text-lg text-white">{feedbackList.length} Guest Responses Received</h3>
            <p className="text-xs text-slate-400 mt-1">
              Public feedback URL: <code className="text-indigo-400 font-mono">https://magizhnaazh.com/feedback/wed-felix-2026</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-xs">
          <QrCode className="w-10 h-10 text-emerald-400" />
          <span className="text-slate-300 font-bold">Printable Feedback QR Code active</span>
        </div>
      </div>

      {/* Feedback Feed List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feedbackList.map((fb) => (
          <div key={fb.id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{fb.guestName || 'Guest'}</span>
              <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {fb.overallRating}.0 / 5.0
              </div>
            </div>

            {fb.comments && <p className="text-xs text-slate-300 italic leading-relaxed">"{fb.comments}"</p>}

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Venue: <strong className="text-slate-200">{fb.venueRating || 5}★</strong></span>
              <span>Catering: <strong className="text-slate-200">{fb.cateringRating || 5}★</strong></span>
              <span>Decor: <strong className="text-slate-200">{fb.decorationRating || 5}★</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Guest Feedback Submission Modal */}
      {showPublicForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-display font-bold text-xl text-white">Event Feedback Form</h3>
            <p className="text-xs text-slate-400">Share your thoughts on Felix & Priya's Wedding Celebration</p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Your Name (Optional)</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Leave blank for anonymous"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Overall Event Rating</label>
                    <select
                      value={overallRating}
                      onChange={(e) => setOverallRating(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold"
                    >
                      <option value={5}>5 ★ Exceptional</option>
                      <option value={4}>4 ★ Very Good</option>
                      <option value={3}>3 ★ Average</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Catering Feast Rating</label>
                    <select
                      value={cateringRating}
                      onChange={(e) => setCateringRating(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold"
                    >
                      <option value={5}>5 ★ Delicious</option>
                      <option value={4}>4 ★ Good</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Comments & Suggestions</label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="What did you enjoy most about the event?"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPublicForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-lg">Thank You for Your Feedback!</h4>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setShowPublicForm(false);
                  }}
                  className="px-6 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
