import React, { useEffect, useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { Invitation } from '../../../../packages/shared-types';
import { fetchPublicInvitation, submitRSVP } from '../api';
import { PublicInvitationView } from './PublicInvitationView';

// Rendered instead of the main authenticated app when the URL is /invite/:token
// (see main.tsx). No login required — this is the page a guest lands on after
// clicking a shared RSVP link.
export const PublicInviteRoute: React.FC<{ token: string }> = ({ token }) => {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicInvitation(token)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.invitation) {
          setInvitation(res.data.invitation);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading invitation...
      </div>
    );
  }

  if (notFound || !invitation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center px-4 gap-3">
        <XCircle className="w-10 h-10 text-rose-400" />
        <h1 className="font-display font-bold text-xl text-white">Invitation link invalid or expired</h1>
        <p className="text-slate-400 text-sm max-w-sm">
          This RSVP link doesn't match any invitation. Double-check the link the host shared with you.
        </p>
      </div>
    );
  }

  return (
    <PublicInvitationView
      invitation={invitation}
      standalone
      onSubmitRSVP={async (data) => {
        await submitRSVP({
          name: data.name,
          eventId: invitation.eventId,
          status: data.status,
          adultsCount: data.adults,
          dietaryPreference: data.dietary,
        });
      }}
    />
  );
};
